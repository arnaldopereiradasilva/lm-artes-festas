const express = require('express');
const router = express.Router();
const { autenticado } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const bloqueios = await req.db.all('SELECT * FROM bloqueios ORDER BY data DESC');
    res.json(bloqueios);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/', autenticado, async (req, res) => {
  try {
    const { data, motivo } = req.body;
    if (!data) return res.status(400).json({ erro: 'Data e obrigatoria' });

    try {
      await req.db.run('INSERT INTO bloqueios (data, motivo) VALUES (?, ?)', [data, motivo || 'Sem motivo']);
      res.status(201).json({ ok: true });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ erro: 'Data ja esta bloqueada' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:data', autenticado, async (req, res) => {
  try {
    const result = await req.db.run('DELETE FROM bloqueios WHERE data = ?', [req.params.data]);
    if (result.changes === 0) return res.status(404).json({ erro: 'Bloqueio nao encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
