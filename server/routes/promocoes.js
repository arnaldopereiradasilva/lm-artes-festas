const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticado } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const nome = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const extensoesValidas = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (tipos.includes(file.mimetype) && extensoesValidas.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido'));
    }
  }
});

router.post('/imagem', autenticado, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
  res.json({ ok: true, caminho: '/uploads/' + req.file.filename });
});

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