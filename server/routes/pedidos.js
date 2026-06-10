const express = require('express');
const router = express.Router();
const { autenticado } = require('../middleware/auth');
const { pedidoLimiter } = require('../middleware/ratelimit');

function gerarNumeroPedido() {
  return 'LM' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-2).toUpperCase();
}

function converterParaISO(dataStr) {
  if (!dataStr) return null;
  if (dataStr.indexOf('/') !== -1) {
    const parts = dataStr.split('/');
    if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  return dataStr;
}

function validarCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11 || /^(\d)\1+$/.test(numeros)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i);
  let dig1 = 11 - (soma % 11);
  if (dig1 > 9) dig1 = 0;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i);
  let dig2 = 11 - (soma % 11);
  if (dig2 > 9) dig2 = 0;
  return dig1 === parseInt(numeros[9]) && dig2 === parseInt(numeros[10]);
}

router.post('/', pedidoLimiter, async (req, res) => {
  try {
    const { cliente, evento, equipe, estacoes, pagamento, total } = req.body;
    if (!cliente || !evento || !equipe || !pagamento || !total) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }
    if (!cliente.nome || !cliente.whatsapp || !cliente.email || !cliente.cpf) {
      return res.status(400).json({ erro: 'Dados do cliente sao obrigatorios' });
    }
    if (!validarCPF(cliente.cpf)) {
      return res.status(400).json({ erro: 'CPF invalido' });
    }
    if (!evento.data || !evento.horario || !evento.endereco || !evento.convidados) {
      return res.status(400).json({ erro: 'Dados do evento sao obrigatorios' });
    }

    const convidados = parseInt(evento.convidados);
    if (isNaN(convidados) || convidados < 1 || convidados > 5000) {
      return res.status(400).json({ erro: 'Numero de convidados invalido' });
    }

    const dataISO = converterParaISO(evento.data);
    const config = await req.db.get('SELECT valor FROM configuracoes WHERE chave = ?', ['max_eventos_por_dia']);
    const maxEventos = parseInt(config?.valor) || 5;

    const count = await req.db.get(
      `SELECT COUNT(*) as total FROM pedidos WHERE evento_data = ? AND status != 'cancelado'`,
      [dataISO]
    );
    if (count.total >= maxEventos) {
      return res.status(400).json({ erro: 'Data lotada. Escolha outra data.' });
    }

    const numeroPedido = gerarNumeroPedido();
    const equipeJson = JSON.stringify(equipe);
    const estacoesJson = estacoes ? JSON.stringify(estacoes) : JSON.stringify({});

    const result = await req.db.run(
      `INSERT INTO pedidos (
        numero_pedido, cliente_nome, cliente_whatsapp, cliente_email, cliente_cpf,
        evento_data, evento_horario, evento_duracao, evento_endereco, evento_convidados,
        equipe, estacoes, pagamento, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
      [
        numeroPedido, cliente.nome, cliente.whatsapp, cliente.email, cliente.cpf,
        dataISO, evento.horario, evento.duracao || '5', evento.endereco,
        convidados, equipeJson, estacoesJson, pagamento, parseFloat(total)
      ]
    );

    res.status(201).json({ ok: true, numeroPedido, id: result.lastID });
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ erro: 'Erro interno ao criar pedido' });
  }
});

router.get('/', autenticado, async (req, res) => {
  try {
    const { status, busca } = req.query;
    let sql = 'SELECT * FROM pedidos';
    const params = [];
    const conditions = [];

    if (status && status !== 'todos') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (busca) {
      conditions.push('(cliente_nome LIKE ? OR cliente_whatsapp LIKE ? OR numero_pedido LIKE ?)');
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY criado_em DESC';

    const pedidos = await req.db.all(sql, params);

    const pedidosParseados = pedidos.map(p => ({
      ...p,
      equipe: JSON.parse(p.equipe),
      estacoes: JSON.parse(p.estacoes || '{}')
    }));

    res.json(pedidosParseados);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/datas-ocupadas', async (req, res) => {
  try {
    const maxEventos = parseInt(req.query.max || 5);

    const rows = await req.db.all(
      `SELECT evento_data, COUNT(*) as total FROM pedidos WHERE status != 'cancelado' GROUP BY evento_data HAVING total >= ?`,
      [maxEventos]
    );
    const bloqueios = await req.db.all('SELECT data FROM bloqueios');

    const ocupadas = new Set(rows.map(r => r.evento_data));
    bloqueios.forEach(b => ocupadas.add(b.data));

    res.json(Array.from(ocupadas));
  } catch (err) {
    console.error('Erro ao buscar datas:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/resumo', autenticado, async (req, res) => {
  try {
    const pedidos = await req.db.all('SELECT * FROM pedidos');

    const total = pedidos.length;
    const confirmados = pedidos.filter(p => p.status === 'confirmado').length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const faturamento = pedidos.filter(p => p.status !== 'cancelado').reduce((acc, p) => acc + p.total, 0);

    res.json({ total, confirmados, pendentes, faturamento });
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:numeroPedido', autenticado, async (req, res) => {
  try {
    const pedido = await req.db.get('SELECT * FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    if (!pedido) return res.status(404).json({ erro: 'Pedido nao encontrado' });

    res.json({
      ...pedido,
      equipe: JSON.parse(pedido.equipe),
      estacoes: JSON.parse(pedido.estacoes || '{}')
    });
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:numeroPedido/status', autenticado, async (req, res) => {
  try {
    const { status } = req.body;
    const validos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
    if (!validos.includes(status)) {
      return res.status(400).json({ erro: 'Status invalido' });
    }

    const result = await req.db.run('UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE numero_pedido = ?', [status, req.params.numeroPedido]);
    if (result.changes === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });

    res.json({ ok: true, status });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:numeroPedido', autenticado, async (req, res) => {
  try {
    const result = await req.db.run('DELETE FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    if (result.changes === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir pedido:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
