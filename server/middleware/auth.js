const { getDb } = require('../db');

async function autenticado(req, res, next) {
  if (req.session && req.session.usuarioId) {
    try {
      const db = getDb();
      const usuario = await db.get('SELECT id, username FROM usuarios WHERE id = ?', [req.session.usuarioId]);
      db.close();
      if (usuario) {
        req.usuario = usuario;
        return next();
      }
    } catch (err) {
      console.error('Erro na autenticacao:', err);
    }
  }
  res.status(401).json({ erro: 'Nao autenticado' });
}

module.exports = { autenticado };
