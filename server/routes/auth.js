const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getDb } = require('../db');
const { autenticado } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/ratelimit');

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, senha } = req.body;
    if (!username || !senha) {
      return res.status(400).json({ erro: 'Usuario e senha sao obrigatorios' });
    }

    const db = getDb();
    const usuario = await db.get('SELECT * FROM usuarios WHERE username = ?', [username]);
    db.close();

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuario ou senha incorretos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Usuario ou senha incorretos' });
    }

    req.session.usuarioId = usuario.id;
    req.session.username = usuario.username;

    res.json({ ok: true, username: usuario.username });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao sair' });
    res.json({ ok: true });
  });
});

router.get('/me', autenticado, (req, res) => {
  res.json({ ok: true, username: req.usuario.username });
});

router.post('/trocar-senha', autenticado, async (req, res) => {
  try {
    const { senhaAtual, senhaNova, senhaConfirmar } = req.body;
    if (!senhaAtual || !senhaNova || !senhaConfirmar) {
      return res.status(400).json({ erro: 'Preencha todos os campos' });
    }
    if (senhaNova !== senhaConfirmar) {
      return res.status(400).json({ erro: 'As senhas nao coincidem' });
    }
    if (senhaNova.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const db = getDb();
    const usuario = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!usuario) { db.close(); return res.status(404).json({ erro: 'Usuario nao encontrado' }); }

    const valida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!valida) { db.close(); return res.status(401).json({ erro: 'Senha atual incorreta' }); }

    const hashNova = await bcrypt.hash(senhaNova, 10);
    await db.run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hashNova, req.usuario.id]);
    db.close();

    res.json({ ok: true, msg: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
