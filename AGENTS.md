# L&M Artes e Festas — Projeto

## IMPORTANTE (versão gratuita)
- **Site ativo e gratuito:** pasta `site-netlify/` (site 100% estático, sem backend)
- Hospedado de graça no Netlify (arrasta e solta a pasta `site-netlify/`)
- Sem painel admin, sem cartão. Pagamento só PIX. Pedido vai direto pro WhatsApp.
- Para editar preços/PIX/WhatsApp: abrir `site-netlify/lm-script.js` (ver README local)
- Ver `site-netlify/README.md` para instruções de deploy


## Stack
- Node.js + Express.js + SQLite
- Frontend: HTML/CSS/JS puro (sem frameworks)
- Hospedagem: Render Starter ($7/mês) + 1GB disco persistente
- Pagamentos: PIX (chave na tela + comprovante por WhatsApp) e cartão via WhatsApp
- Domínio: a comprar (~R$ 40/ano)

## URLs
- **Site:** https://lm-artes-festas.onrender.com
- **Admin:** https://lm-artes-festas.onrender.com/admin.html
- **Login admin:** lenice / admin123 (trocar senha em Configurações)

## Variáveis de ambiente (Render)
- NODE_ENV=production
- SESSION_SECRET=<gerado>
- BASE_URL=https://lm-artes-festas.onrender.com
- ADMIN_RESET_SECRET=<chave para reset>

## Configurações do admin
- WhatsApp: 5521985412860
- PIX: 101.011.487-55
- Email: lenicebraga@hotmail.com

## Correções aplicadas
1. **Upload de fotos** — UPLOAD_DIR em `server/routes/fotos.js` aponta para `server/data/uploads/` (estava indo para `routes/data/uploads/` — servidor estático não encontrava)
2. **Sessão expirada** — admin agora detecta 401 e redireciona para tela de login; ao carregar a página, verifica sessão ativa via API
3. **MemoryStore** — usado pois connect-sqlite3 não funciona no Node 24 do Render
4. **Disco persistente** — SQLite e uploads em `/opt/render/project/src/server/data/` sobrevivem a deploys

## Pendente / Próximos passos
- **Comprar domínio** (ex: lmartesfestas.com.br) e configurar no Render
- O domínio deve apontar os nameservers para o Render (ou configurar CNAME)

## Contato
- Cliente: Lenice
- WhatsApp: 21985412860
- Email: lenicebraga@hotmail.com
