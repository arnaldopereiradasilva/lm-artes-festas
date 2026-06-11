const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { autenticado } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/ratelimit');

async function limparTentativasExpiradas(req) {
  await req.db.run("DELETE FROM tentativas_login WHERE bloqueado_ate IS NOT NULL AND bloqueado_ate < datetime('now')");
}

async function registrarTentativa(req, ip, sucesso) {
  if (sucesso) {
    await req.db.run('DELETE FROM tentativas_login WHERE ip = ?', [ip]);
  } else {
    const row = await req.db.get('SELECT id, tentativas FROM tentativas_login WHERE ip = ?', [ip]);
    if (row) {
      const novas = row.tentativas + 1;
      if (novas >= 5) {
        const bloqueadoAte = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await req.db.run('UPDATE tentativas_login SET tentativas = ?, bloqueado_ate = ?, ultima_tentativa = CURRENT_TIMESTAMP WHERE id = ?', [novas, bloqueadoAte, row.id]);
      } else {
        await req.db.run('UPDATE tentativas_login SET tentativas = ?, ultima_tentativa = CURRENT_TIMESTAMP WHERE id = ?', [novas, row.id]);
      }
    } else {
      await req.db.run('INSERT INTO tentativas_login (ip, tentativas, ultima_tentativa) VALUES (?, 1, CURRENT_TIMESTAMP)', [ip]);
    }
  }
}

async function isBloqueado(req, ip) {
  const row = await req.db.get('SELECT bloqueado_ate FROM tentativas_login WHERE ip = ? AND bloqueado_ate IS NOT NULL', [ip]);
  if (!row) return false;
  return new Date(row.bloqueado_ate) > new Date();
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, senha } = req.body;
    if (!username || !senha) {
      return res.status(400).json({ erro: 'Usuario e senha sao obrigatorios' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    await limparTentativasExpiradas(req);
    if (await isBloqueado(req, ip)) {
      return res.status(429).json({ erro: 'Conta temporariamente bloqueada por muitas tentativas. Tente novamente em 15 minutos.' });
    }

    const usuario = await req.db.get('SELECT * FROM usuarios WHERE username = ?', [username]);

    if (!usuario) {
      await registrarTentativa(req, ip, false);
      return res.status(401).json({ erro: 'Usuario ou senha incorretos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      await registrarTentativa(req, ip, false);
      return res.status(401).json({ erro: 'Usuario ou senha incorretos' });
    }

    await registrarTentativa(req, ip, true);
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
    if (senhaNova.length < 8) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres' });
    }
    if (!/[A-Z]/.test(senhaNova) || !/[a-z]/.test(senhaNova) || !/[0-9]/.test(senhaNova)) {
      return res.status(400).json({ erro: 'A senha deve conter letras maiusculas, minusculas e numeros' });
    }

    const usuario = await req.db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!usuario) { return res.status(404).json({ erro: 'Usuario nao encontrado' }); }

    const valida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!valida) { return res.status(401).json({ erro: 'Senha atual incorreta' }); }

    const hashNova = await bcrypt.hash(senhaNova, 10);
    await req.db.run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hashNova, req.usuario.id]);

    res.json({ ok: true, msg: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/reset-admin', async (req, res) => {
  const resetSecret = process.env.ADMIN_RESET_SECRET;
  if (!resetSecret || req.query.secret !== resetSecret) {
    return res.status(401).json({ erro: 'Chave invalida' });
  }
  const senhaNova = req.query.senha || Math.random().toString(36).slice(-10) + 'A1';
  if (senhaNova.length < 6) return res.status(400).json({ erro: 'Senha muito curta' });
  try {
    const hash = await bcrypt.hash(senhaNova, 10);
    const existe = await req.db.get('SELECT id FROM usuarios WHERE username = ?', ['lenice']);
    if (existe) {
      await req.db.run('UPDATE usuarios SET senha_hash = ? WHERE username = ?', [hash, 'lenice']);
    } else {
      await req.db.run('INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)', ['lenice', hash]);
    }
    res.json({ ok: true, usuario: 'lenice', senha: senhaNova, msg: 'Senha redefinida. Troque no painel!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
