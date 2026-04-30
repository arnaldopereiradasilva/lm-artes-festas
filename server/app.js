require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { apiLimiter } = require('./middleware/ratelimit');
const { sanitizeBody } = require('./middleware/sanitize');
const { initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeBody);

app.use(session({
  secret: process.env.SESSION_SECRET || 'trocar-esta-chave-em-producao-urgente',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/api', apiLimiter);

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
