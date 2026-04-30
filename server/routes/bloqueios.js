const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const bloqueios = await db.all('SELECT * FROM bloqueios ORDER BY data DESC');
    db.close();
    res.json(bloqueios);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/', autenticado, async (req, res) => {
  try {
    const { data, motivo } = req.body;
    if (!data) return res.status(400).json({ erro: 'Data e obrigatoria' });

    const db = getDb();
    try {
      await db.run('INSERT INTO bloqueios (data, motivo) VALUES (?, ?)', [data, motivo || 'Sem motivo']);
      db.close();
      res.status(201).json({ ok: true });
    } catch (err) {
      db.close();
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
    const db = getDb();
    const result = await db.run('DELETE FROM bloqueios WHERE data = ?', [req.params.data]);
    db.close();
    if (result.changes === 0) return res.status(404).json({ erro: 'Bloqueio nao encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
