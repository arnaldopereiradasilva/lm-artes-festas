require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { apiLimiter } = require('./middleware/ratelimit');
const { sanitizeInputs } = require('./middleware/sanitize');
const { initDatabase, dbMiddleware } = require('./db');

if (!process.env.SESSION_SECRET) {
  console.error('ERRO CRITICO: Variavel SESSION_SECRET nao definida no .env');
  console.error('Gere uma chave aleatoria: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.mercadopago.com'],
      frameSrc: ["'self'", 'https://www.mercadopago.com']
    }
  }
}));

app.use(cors({
  origin: process.env.BASE_URL || 'http://localhost:3000',
  credentials: true
}));

app.use((req, res, next) => {
  if (req.path === '/api/pagamento/webhook' && req.method === 'POST') {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeInputs);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Formato de dados invalido' });
  }
  next(err);
});

app.use(session({
  store: new SQLiteStore({ dir: path.join(__dirname, 'data'), db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/api', apiLimiter);

app.use('/api', dbMiddleware);

app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    if (req.path === '/api/pagamento/webhook') return next();
    const origin = req.get('origin');
    const referer = req.get('referer');
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const origemPermitida = new URL(baseUrl).origin;
    if (origin && origin !== origemPermitida) {
      return res.status(403).json({ erro: 'Requisicao rejeitada' });
    }
    if (referer && !referer.startsWith(origemPermitida)) {
      return res.status(403).json({ erro: 'Requisicao rejeitada' });
    }
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/saude', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authRoutes = require('./routes/auth');
const pedidosRoutes = require('./routes/pedidos');
const configRoutes = require('./routes/config');
const bloqueiosRoutes = require('./routes/bloqueios');
const fotosRoutes = require('./routes/fotos');
const pagamentoRoutes = require('./routes/pagamento');

app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/config', configRoutes);
app.use('/api/bloqueios', bloqueiosRoutes);
app.use('/api/fotos', fotosRoutes);
app.use('/api/pagamento', pagamentoRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({ erro: 'Erro interno do servidor' });
});

async function start() {
  try {
    await initDatabase();
    console.log('Banco de dados inicializado');

    const { dbRun, dbOpen } = require('./db');
    const cleanupDb = await dbOpen();
    await dbRun(cleanupDb, "DELETE FROM tentativas_login WHERE bloqueado_ate IS NOT NULL AND bloqueado_ate < datetime('now')");
    cleanupDb.close();

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
