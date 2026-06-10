const express = require('express');
const router = express.Router();
const { autenticado } = require('../middleware/auth');

const CHAVES_SENSIVEIS = ['mp_access_token', 'mp_token', 'mp_public_key', 'mp_nome', 'mp_documento', 'mp_email'];

function isChaveSensivel(chave) {
  return CHAVES_SENSIVEIS.some(s => chave.toLowerCase().includes(s.toLowerCase()));
}

router.get('/', async (req, res) => {
  try {
    const configs = await req.db.all('SELECT chave, valor FROM configuracoes');
    const result = {};
    configs.forEach(c => {
      if (!isChaveSensivel(c.chave)) {
        result[c.chave] = c.valor;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/lote', autenticado, async (req, res) => {
  try {
    const configs = req.body;
    if (!configs || typeof configs !== 'object') return res.status(400).json({ erro: 'Dados invalidos' });

    for (const [chave, valor] of Object.entries(configs)) {
      await req.db.run('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [chave, String(valor)]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:chave', autenticado, async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor === undefined) return res.status(400).json({ erro: 'Valor e obrigatorio' });
    await req.db.run('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [req.params.chave, String(valor)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
