const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'lm-artes.db');

function dbOpen() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function initDatabase() {
  const db = await dbOpen();
  await dbRun(db, 'PRAGMA journal_mode = WAL');
  await dbRun(db, 'PRAGMA foreign_keys = ON');

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_pedido TEXT UNIQUE NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_whatsapp TEXT NOT NULL,
      cliente_email TEXT NOT NULL,
      cliente_cpf TEXT NOT NULL,
      evento_data TEXT NOT NULL,
      evento_horario TEXT NOT NULL,
      evento_duracao TEXT NOT NULL,
      evento_endereco TEXT NOT NULL,
      evento_convidados INTEGER NOT NULL,
      equipe TEXT NOT NULL,
      estacoes TEXT,
      pagamento TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pendente',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS bloqueios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT UNIQUE NOT NULL,
      motivo TEXT DEFAULT 'Sem motivo',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS fotos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      caminho TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS promocoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      subtitulo TEXT DEFAULT '',
      preco TEXT DEFAULT '',
      imagem TEXT DEFAULT '',
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS tentativas_login (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      tentativas INTEGER DEFAULT 1,
      bloqueado_ate DATETIME,
      ultima_tentativa DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await inserirConfiguracoesPadrao(db);
  await inserirUsuarioPadrao(db);

  db.close();
  return DB_PATH;
}

async function inserirConfiguracoesPadrao(db) {
  const padrao = [
    { chave: 'whatsapp', valor: '5521985412860' },
    { chave: 'email', valor: 'lenicebraga@hotmail.com' },
    { chave: 'pix', valor: 'lenicebraga@hotmail.com' },
    { chave: 'max_eventos_por_dia', valor: '5' },
    { chave: 'preco_garcom', valor: '180' },
    { chave: 'preco_copeira', valor: '160' },
    { chave: 'preco_fritadeira', valor: '150' },
    { chave: 'preco_churrasqueiro', valor: '220' },
    { chave: 'preco_monitora', valor: '140' },
    { chave: 'preco_recepcionista', valor: '160' },
    { chave: 'preco_pipoca', valor: '120' },
    { chave: 'preco_algodao', valor: '130' },
    { chave: 'preco_acai', valor: '200' },
    { chave: 'preco_sorvete', valor: '180' },
    { chave: 'preco_batata', valor: '150' },
    { chave: 'preco_crepe', valor: '160' },
    { chave: 'preco_suco', valor: '140' },
    { chave: 'equipe_base_local', valor: 'Av. do Contorno, 129 - Paciência - CEP 23585-808' },
    { chave: 'equipe_carro_base', valor: '10.00' },
    { chave: 'equipe_custo_km', valor: '3.00' },
    { chave: 'equipe_moto_base', valor: '3.00' },
    { chave: 'equipe_custo_km_moto', valor: '1.00' },
    { chave: 'equipe_por_carro', valor: '4' },
    { chave: 'equipe_99_client_id', valor: '' },
  ];

  for (const c of padrao) {
    await dbRun(db, 'INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)', [c.chave, c.valor]);
  }

  const qtdPromos = await dbGet(db, 'SELECT COUNT(*) AS total FROM promocoes');
  if (qtdPromos.total === 0) {
    const promosExemplo = [
      { titulo: 'Dia dos Pais', subtitulo: 'Combo de 3 profissionais', preco: 'R$ 250,00', ativo: 1, ordem: 1 },
      { titulo: 'Combo Aniversário', subtitulo: '2 garçons + 1 recepcionista', preco: 'R$ 490,00', ativo: 1, ordem: 2 }
    ];
    for (const p of promosExemplo) {
      await dbRun(db, 'INSERT INTO promocoes (titulo, subtitulo, preco, ativo, ordem) VALUES (?, ?, ?, ?, ?)',
        [p.titulo, p.subtitulo, p.preco, p.ativo, p.ordem]);
    }
  }
}

async function inserirUsuarioPadrao(db) {
  const existe = await dbGet(db, 'SELECT id FROM usuarios WHERE username = ?', ['lenice']);
  if (!existe) {
    const senhaPadrao = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-6).toUpperCase();
    const senhaHash = await bcrypt.hash(senhaPadrao, 10);
    await dbRun(db, 'INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)', ['lenice', senhaHash]);
    try {
      fs.writeFileSync(path.join(__dirname, '..', '.senha_inicial.txt'), 'Usuario: lenice\nSenha: ' + senhaPadrao + '\n\nTROQUE A SENHA NO PAINEL IMEDIATAMENTE!\n');
    } catch (_) {}
    console.log('Usuario padrao criado. A senha inicial esta em .senha_inicial.txt');
  }
}

function getDb() {
  const db = new sqlite3.Database(DB_PATH);
  return {
    run: (sql, params) => dbRun(db, sql, params),
    get: (sql, params) => dbGet(db, sql, params),
    all: (sql, params) => dbAll(db, sql, params),
    close: () => new Promise(resolve => db.close(resolve))
  };
}

function dbMiddleware(req, res, next) {
  const db = new sqlite3.Database(DB_PATH);
  req.db = {
    run: (sql, params) => dbRun(db, sql, params),
    get: (sql, params) => dbGet(db, sql, params),
    all: (sql, params) => dbAll(db, sql, params),
  };
  res.on('finish', () => db.close());
  next();
}

module.exports = { initDatabase, getDb, dbOpen, dbRun, dbGet, dbAll, dbMiddleware };
