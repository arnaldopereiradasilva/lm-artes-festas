const express = require('express');
const router = express.Router();
const { autenticado } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const promos = await req.db.all(
      'SELECT * FROM promocoes WHERE ativo = 1 ORDER BY ordem ASC, id DESC'
    );
    res.json(promos);
  } catch (err) {
    console.error('Erro ao listar promocoes:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/todas', autenticado, async (req, res) => {
  try {
    const promos = await req.db.all('SELECT * FROM promocoes ORDER BY ordem ASC, id DESC');
    res.json(promos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/', autenticado, async (req, res) => {
  const { titulo, subtitulo, preco, imagem, ativo, ordem } = req.body;
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ erro: 'Titulo e obrigatorio' });
  }
  try {
    await req.db.run(
      'INSERT INTO promocoes (titulo, subtitulo, preco, imagem, ativo, ordem) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo.trim(), subtitulo || '', preco || '', imagem || '', ativo ? 1 : 0, parseInt(ordem) || 0]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao criar promocao:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:id', autenticado, async (req, res) => {
  const { titulo, subtitulo, preco, imagem, ativo, ordem } = req.body;
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ erro: 'Titulo e obrigatorio' });
  }
  try {
    await req.db.run(
      'UPDATE promocoes SET titulo = ?, subtitulo = ?, preco = ?, imagem = ?, ativo = ?, ordem = ? WHERE id = ?',
      [titulo.trim(), subtitulo || '', preco || '', imagem || '', ativo ? 1 : 0, parseInt(ordem) || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar promocao:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:id', autenticado, async (req, res) => {
  try {
    await req.db.run('DELETE FROM promocoes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;