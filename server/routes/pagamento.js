const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/ratelimit');

async function getMercadoPagoConfig(db) {
  let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  let modo = process.env.MERCADOPAGO_MODE || 'sandbox';

  if (db) {
    try {
      const tokenRow = await db.get('SELECT valor FROM configuracoes WHERE chave = ?', ['mp_access_token']);
      if (tokenRow && tokenRow.valor) accessToken = tokenRow.valor;
      const modoRow = await db.get('SELECT valor FROM configuracoes WHERE chave = ?', ['mp_modo']);
      if (modoRow && modoRow.valor) modo = modoRow.valor;
    } catch (e) { /* fallback to env */ }
  }

  return { accessToken, modo };
}

async function criarPreferenciaMp(item, payer, db) {
  const { accessToken } = await getMercadoPagoConfig(db);
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

    const pedido = await req.db.get('SELECT * FROM pedidos WHERE numero_pedido = ?', [req.params.numeroPedido]);
    if (!pedido) { return res.status(404).json({ erro: 'Pedido nao encontrado' }); }

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
      },
      req.db
    );

    const { modo } = await getMercadoPagoConfig(req.db);
    const linkPagamento = modo === 'producao' ? preferencia.init_point : preferencia.sandbox_init_point;

    await req.db.run(
      'INSERT INTO links_pagamento (pedido_numero, cliente_nome, descricao, valor, link, status) VALUES (?, ?, ?, ?, ?, ?)',
      [pedido.numero_pedido, pedido.cliente_nome, `Pedido #${pedido.numero_pedido}`, pedido.total, linkPagamento, 'pendente']
    );

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
      { name: cliente },
      req.db
    );

    const { modo } = await getMercadoPagoConfig(req.db);
    const linkPagamento = modo === 'producao' ? preferencia.init_point : preferencia.sandbox_init_point;

    await req.db.run(
      'INSERT INTO links_pagamento (cliente_nome, cliente_whatsapp, descricao, valor, link, status) VALUES (?, ?, ?, ?, ?, ?)',
      [cliente, whatsapp || '', descricao, parseFloat(valor), linkPagamento, 'pendente']
    );

    res.json({ link: linkPagamento, whatsapp });
  } catch (err) {
    console.error('Erro ao gerar link:', err);
    res.status(500).json({ erro: 'Erro ao gerar link de pagamento' });
  }
});

router.get('/links', autenticado, async (req, res) => {
  try {
    const links = await req.db.all('SELECT * FROM links_pagamento ORDER BY criado_em DESC LIMIT 50');
    res.json(links);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

function verificarAssinaturaWebhook(dataId, signatureHeader, requestIdHeader) {
  if (!signatureHeader || !dataId) return false;
  try {
    const parts = signatureHeader.split(',');
    let ts = '', v1 = '';
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key === 'ts') ts = val;
      if (key === 'v1') v1 = val;
    }
    if (!ts || !v1) return false;
    const secret = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!secret) return false;

    const manifest = 'id:' + dataId + ';request-id:' + (requestIdHeader || '') + ';ts:' + ts + ';';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const esperado = hmac.digest('hex');

    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch {
    return false;
  }
}

router.post('/webhook', webhookLimiter, async (req, res) => {
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const { type, data } = req.body;

  if (type !== 'payment' || !data || !data.id) {
    return res.status(200).send('OK');
  }

  const assinaturaValida = verificarAssinaturaWebhook(String(data.id), signature, requestId);
  if (!assinaturaValida) {
    return res.status(401).send('Assinatura invalida');
  }

  const { accessToken } = await getMercadoPagoConfig();
  if (!accessToken) return res.status(200).send('OK');

  const paymentId = data.id;
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payment = await response.json();
    if (!payment || payment.status === undefined) return res.status(200).send('OK');

    const status = payment.status;
    const externalRef = payment.external_reference;
    if (externalRef) {
      let novoStatus = 'pendente';
      if (status === 'approved') novoStatus = 'confirmado';
      else if (status === 'rejected' || status === 'cancelled' || status === 'refunded') novoStatus = 'cancelado';

      const db = getDb();
      await db.run('UPDATE pedidos SET status = ?, atualizado_em = CURRENT_TIMESTAMP WHERE numero_pedido = ?', [novoStatus, externalRef]);
      await db.run('UPDATE links_pagamento SET status = ? WHERE pedido_numero = ?', [status, externalRef]);
      db.close();
    }
  } catch (err) {
    console.error('Erro no webhook:', err);
  }

  res.status(200).send('OK');
});

module.exports = router;
