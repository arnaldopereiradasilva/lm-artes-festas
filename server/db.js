const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'data', 'lm-artes.db');

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
    CREATE TABLE IF NOT EXISTS tentativas_login (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      tentativas INTEGER DEFAULT 1,
      bloqueado_ate DATETIME,
      ultima_tentativa DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS links_pagamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_numero TEXT,
      cliente_nome TEXT NOT NULL,
      cliente_whatsapp TEXT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      link TEXT,
      status TEXT DEFAULT 'pendente',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
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
  ];

  for (const c of padrao) {
    await dbRun(db, 'INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)', [c.chave, c.valor]);
  }
}

async function inserirUsuarioPadrao(db) {
  const existe = await dbGet(db, 'SELECT id FROM usuarios WHERE username = ?', ['lenice']);
  if (!existe) {
    const senhaHash = await bcrypt.hash('lm2025', 10);
    await dbRun(db, 'INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)', ['lenice', senhaHash]);
    console.log('Usuario padrao criado (troque a senha no painel!)');
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

module.exports = { initDatabase, getDb, dbOpen, dbRun, dbGet, dbAll };
