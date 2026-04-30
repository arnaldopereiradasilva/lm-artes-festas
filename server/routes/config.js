const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const configs = await db.all('SELECT chave, valor FROM configuracoes');
    db.close();
    const result = {};
    configs.forEach(c => { result[c.chave] = c.valor });
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:chave', autenticado, async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor === undefined) return res.status(400).json({ erro: 'Valor e obrigatorio' });
    const db = getDb();
    await db.run('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [req.params.chave, String(valor)]);
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/lote', autenticado, async (req, res) => {
  try {
    const configs = req.body;
    if (!configs || typeof configs !== 'object') return res.status(400).json({ erro: 'Dados invalidos' });

    const db = getDb();
    for (const [chave, valor] of Object.entries(configs)) {
      await db.run('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [chave, String(valor)]);
    }
    db.close();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
