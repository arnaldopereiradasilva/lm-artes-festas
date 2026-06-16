const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticado } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
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

router.get('/:tipo', async (req, res) => {
  try {
    const tipos = ['avaliacoes', 'eventos', 'estacoes'];
    if (!tipos.includes(req.params.tipo)) return res.status(400).json({ erro: 'Tipo invalido' });

    const fotos = await req.db.all('SELECT * FROM fotos WHERE tipo = ? ORDER BY ordem ASC, id ASC', [req.params.tipo]);
    res.json(fotos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/:tipo', autenticado, upload.array('fotos', 20), async (req, res) => {
  try {
    const tipos = ['avaliacoes', 'eventos', 'estacoes'];
    if (!tipos.includes(req.params.tipo)) return res.status(400).json({ erro: 'Tipo invalido' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ erro: 'Nenhuma foto enviada' });

    const maxOrdem = await req.db.get('SELECT COALESCE(MAX(ordem), -1) as maxOrdem FROM fotos WHERE tipo = ?', [req.params.tipo]);
    const inicioOrdem = (maxOrdem && maxOrdem.maxOrdem !== null) ? maxOrdem.maxOrdem + 1 : 0;

    for (let i = 0; i < req.files.length; i++) {
      await req.db.run('INSERT INTO fotos (tipo, caminho, ordem) VALUES (?, ?, ?)', [req.params.tipo, '/uploads/' + req.files[i].filename, inicioOrdem + i]);
    }
    res.status(201).json({ ok: true, fotos: req.files.length });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:id', autenticado, async (req, res) => {
  try {
    const foto = await req.db.get('SELECT * FROM fotos WHERE id = ?', [req.params.id]);
    if (!foto) { return res.status(404).json({ erro: 'Foto nao encontrada' }); }

    const caminhoCompleto = path.join(UPLOAD_DIR, path.basename(foto.caminho));
    if (fs.existsSync(caminhoCompleto)) fs.unlinkSync(caminhoCompleto);

    await req.db.run('DELETE FROM fotos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
