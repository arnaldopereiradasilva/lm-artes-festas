# lm-artes-festas
Site da L&M Festas e Eventos

## Instalacao e Inicializacao

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variaveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (SESSION_SECRET, Mercado Pago, etc.)

# 3. Iniciar servidor
node server/app.js

# 4. Acessar
# Site publico: http://localhost:3000
# Painel admin: http://localhost:3000/admin.html
# Login padrao: lenice (senha gerada na primeira execucao - veja .senha_inicial.txt)
```

## Instrucoes de Seguranca para Producao

### 1. HTTPS Obrigatorio
Nao rode esta aplicacao exposta diretamente na internet sem HTTPS. Use um reverse proxy como Nginx ou Caddy para gerar certificados SSL gratuitos (Let's Encrypt).

### 2. Backup Diario
O banco de dados SQLite deve ser copiado diariamente. Use o comando abaixo ou agende via `cron`/`Task Scheduler`:
```bash
npm run backup
```

### 3. Protecao de Dados
- Nunca compartilhe o arquivo `.env` ou o banco de dados `lm-artes.db` publicamente.
- Altere a senha do usuario `lenice` imediatamente apos o primeiro login.
- Mantenha o `SESSION_SECRET` em `.env` secreto e nunca o commit no git.

### 4. Atualizacoes
Rode `npm audit` regularmente e atualize as dependencias para corrigir vulnerabilidades conhecidas.

### 5. Mercado Pago
Mantenha as credenciais do Mercado Pago no modo `sandbox` ate estar pronto para producao. Troque para `producao` apenas quando o site estiver em HTTPS e com o dominio configurado.
