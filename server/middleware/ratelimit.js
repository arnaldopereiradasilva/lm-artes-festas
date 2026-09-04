const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { erro: 'Muitas requisicoes. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const pedidoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { erro: 'Limite de pedidos excedido. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter, pedidoLimiter };
