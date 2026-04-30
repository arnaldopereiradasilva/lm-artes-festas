const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');
const { pedidoLimiter } = require('../middleware/ratelimit');

function gerarNumeroPedido() {
  return 'LM' + Date.now().toString().slice(-6);
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
    if (!evento.data || !evento.horario || !evento.endereco || !evento.convidados) {
      return res.status(400).json({ erro: 'Dados do evento sao obrigatorios' });
    }

    const numeroPedido = gerarNumeroPedido();
    const equipeJson = JSON.stringify(equipe);
    const estacoesJson = estacoes ? JSON.stringify(estacoes) : JSON.stringify({});

    const db = getDb();
    const result = await db.run(
      `INSERT INTO pedidos (
        numero_pedido, cliente_nome, cliente_whatsapp, cliente_email, cliente_cpf,
        evento_data, evento_horario, evento_duracao, evento_endereco, evento_convidados,
        equipe, estacoes, pagamento, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
      [
        numeroPedido, cliente.nome, cliente.whatsapp, cliente.email, cliente.cpf,
        evento.data, evento.horario, evento.duracao || '5', evento.endereco,
        parseInt(evento.convidados), equipeJson, estacoesJson, pagamento, parseFloat(total)
      ]
    );
    db.close();

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

    const db = getDb();
    const pedidos = await db.all(sql, params);
    db.close();

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

router.get('/:numeroPedido', autenticado, async (req, res) => {
  try {
    const db = getDb();
    const pedido = await db.get('SELECT * FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    db.close();
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

    const db = getDb();
    const result = await db.run('UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE numero_pedido = ?', [status, req.params.numeroPedido]);
    db.close();
    if (result.changes === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });

    res.json({ ok: true, status });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:numeroPedido', autenticado, async (req, res) => {
  try {
    const db = getDb();
    const result = await db.run('DELETE FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    db.close();
    if (result.changes === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir pedido:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/datas-ocupadas', async (req, res) => {
  try {
    const maxEventos = parseInt(req.query.max || 5);

    const db = getDb();
    const rows = await db.all(
      `SELECT evento_data, COUNT(*) as total FROM pedidos WHERE status != 'cancelado' GROUP BY evento_data HAVING total >= ?`,
      [maxEventos]
    );
    const bloqueios = await db.all('SELECT data FROM bloqueios');
    db.close();

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
    const db = getDb();
    const pedidos = await db.all('SELECT * FROM pedidos');
    db.close();

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

module.exports = router;
