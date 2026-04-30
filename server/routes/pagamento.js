const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');

function getMercadoPagoConfig() {
  return {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    modo: process.env.MERCADOPAGO_MODE || 'sandbox'
  };
}

async function criarPreferenciaMp(item, payer) {
  const { accessToken } = getMercadoPagoConfig();
  if (!accessToken) throw new Error('Mercado Pago nao configurado');

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      items: [item],
      payer,
      back_urls: {
        success: `${process.env.BASE_URL}/sucesso.html`,
        failure: `${process.env.BASE_URL}/erro.html`,
        pending: `${process.env.BASE_URL}/pendente.html`
      },
      auto_return: 'approved',
      statement_descriptor: 'LM ARTES E FESTAS'
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro ao criar preferencia');
  return data;
}

router.post('/pedido/:numeroPedido', async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!['credito', 'debito'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo de pagamento invalido' });
    }

    const db = getDb();
    const pedido = await db.get('SELECT * FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    if (!pedido) { db.close(); return res.status(404).json({ erro: 'Pedido nao encontrado' }); }

    const preferencia = await criarPreferenciaMp(
      {
        title: `Evento L&M - Pedido #${pedido.numero_pedido}`,
        description: `Cliente: ${pedido.cliente_nome} | Data: ${pedido.evento_data}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(pedido.total)
      },
      {
        name: pedido.cliente_nome,
        email: pedido.cliente_email,
        phone: { number: pedido.cliente_whatsapp.replace(/\D/g, '') }
      }
    );

    const { modo } = getMercadoPagoConfig();
    const linkPagamento = modo === 'producao' ? preferencia.init_point : preferencia.sandbox_init_point;

    await db.run(
      'INSERT INTO links_pagamento (pedido_numero, cliente_nome, descricao, valor, link, status) VALUES (?, ?, ?, ?, ?, ?)',
      [pedido.numero_pedido, pedido.cliente_nome, `Pedido #${pedido.numero_pedido}`, pedido.total, linkPagamento, 'pendente']
    );
    db.close();

    res.json({ link: linkPagamento });
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    res.status(500).json({ erro: 'Erro ao processar pagamento' });
  }
});

router.post('/link', autenticado, async (req, res) => {
  try {
    const { cliente, descricao, valor, whatsapp } = req.body;
    if (!cliente || !descricao || !valor || valor <= 0) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    const preferencia = await criarPreferenciaMp(
      {
        title: descricao,
        description: `Cliente: ${cliente}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(valor)
      },
      { name: cliente }
    );

    const { modo } = getMercadoPagoConfig();
    const linkPagamento = modo === 'producao' ? preferencia.init_point : preferencia.sandbox_init_point;

    const db = getDb();
    await db.run(
      'INSERT INTO links_pagamento (cliente_nome, cliente_whatsapp, descricao, valor, link, status) VALUES (?, ?, ?, ?, ?, ?)',
      [cliente, whatsapp || '', descricao, parseFloat(valor), linkPagamento, 'pendente']
    );
    db.close();

    res.json({ link: linkPagamento, whatsapp });
  } catch (err) {
    console.error('Erro ao gerar link:', err);
    res.status(500).json({ erro: 'Erro ao gerar link de pagamento' });
  }
});

router.get('/links', autenticado, async (req, res) => {
  try {
    const db = getDb();
    const links = await db.all('SELECT * FROM links_pagamento ORDER BY criado_em DESC LIMIT 50');
    db.close();
    res.json(links);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/webhook', (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment' && data && data.id) {
    const paymentId = data.id;
    fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
    })
      .then(r => r.json())
      .then(payment => {
        const status = payment.status;
        const externalRef = payment.external_reference;
        if (externalRef) {
          let novoStatus = 'pendente';
          if (status === 'approved') novoStatus = 'confirmado';
          else if (status === 'rejected') novoStatus = 'cancelado';

          const db = getDb();
          db.run('UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE numero_pedido = ?', [novoStatus, externalRef]);
          db.run('UPDATE links_pagamento SET status = ? WHERE pedido_numero = ?', [status, externalRef]);
          db.close();
        }
      })
      .catch(err => console.error('Erro no webhook:', err));
  }

  res.status(200).send('OK');
});

module.exports = router;
