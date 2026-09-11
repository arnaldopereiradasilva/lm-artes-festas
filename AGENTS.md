# L&M Artes e Festas — Projeto

## IMPORTANTE (solução gratuita em vigor)
- **Site hospedado de graça no Netlify** (site estático na pasta `site-netlify/`, plano grátis)
- **Banco/login/fotos de graça no Supabase** (plano grátis, projeto `lm-artes-festas`)
- Painel admin continua funcionando (login e-mail/senha via Supabase Auth)
- Pagamento: só PIX (chave na tela + comprovante por WhatsApp). Pedido vai pro WhatsApp de Lenice.
- Ver `site-netlify/README.md` para instruções de deploy e de como editar preços/PIX/WhatsApp/promoções.

## Stack
- **Frontend:** HTML/CSS/JS puro (sem frameworks), pasta `site-netlify/`
- **Backend de dados:** Supabase (PostgreSQL + Storage + Auth), acesso via API REST
- **Hospedagem:** Netlify (grátis) — conectado ao GitHub (repo `arnaldopereiradasilva/lm-artes-festas`,
  branch `main`, Base directory `site-netlify`). Deploy automático a cada `git push`.
  (Fallback manual: arrastar a pasta `site-netlify/` em https://app.netlify.com/drop)
- **Domínio:** a comprar (~R$ 40/ano) e configurar no Netlify quando decidir

## URLs
- **Site:** https://gorgeous-puffpuff-123a64.netlify.app
- **Admin:** https://gorgeous-puffpuff-123a64.netlify.app/admin.html
- **Login admin:** e-mail `lenicebraga@hotmail.com` (ou digita só `lenice`) — senha inicial combinada com o Arnaldo (trocar no painel em Configurações)

### Resetar senha do admin (Supabase)
- Dashboard Supabase > Authentication > Users > botão ... do usuário > **Reset password**
- (O Supabase envia e-mail de redefinição para o e-mail de Lenice.)

## Supabase (projeto lm-artes-festas)
- Project URL: `https://njhqturaptmjglzejbla.supabase.co`
- Chave pública (segura pra ficar no site): `sb_publishable_SXjPJvmihqe5203gzoFsMw_BU0x9nWs`
- `config.js` na pasta `site-netlify/` guarda essas duas informações (não colocar a Secret key).
- Esquema/redefinições: `site-netlify/supabase-schema.sql` (rodar no SQL Editor; já é idempotente).
- Tabelas: configuracoes, promocoes, pedidos, bloqueios, fotos. Storage bucket: `imagens`.
- RLS: públicos podem ler configurações/promoções(ativas)/bloqueios/fotos e criar pedidos;
  só o admin logado altera tudo.

## Estrutura da pasta site-netlify/
- `index.html` — site público (carrossel de promoções, transporte, pedido, PIX)
- `admin.html` — painel (dashboard, pedidos, calendário, financeiro, promoções, configurações, fotos)
- `api-client.js` — camada única de acesso ao Supabase (mesma interface da versão antiga)
- `config.js` — SUPABASE_URL e SUPABASE_ANON_KEY
- `imagem/` — imagens originais dos carrosséis de eventos/estações/avaliações. Elas foram
  enviadas uma vez como SEED ao Supabase (tabela `fotos` + bucket `imagens`); a partir daí
  as galerias são 100% controladas pelo painel (Fotos). A pasta local continua sendo a
  referência visual e também serve o resto dos assets (logo, ícones sociais).
- `supabase-schema.sql` — criação do banco (já rodado)
- `README.md` — instruções de deploy e edição para a Lenice

## Configurações padrão (tabela configuracoes)
- WhatsApp: 5521985412860 | PIX: lenicebraga@hotmail.com | Email: lenicebraga@hotmail.com
- max_eventos_por_dia: 5 | preços dos serviços e estações | equipe_base_local: Av. do Contorno, 129
- Editáveis pelo painel (Configurações) ou direto no Supabase.

## Correções/lições aplicadas
1. **Fim do Render**: plano Free não tem disco persistente — dados eram apagados a cada deploy.
   Migração para Supabase resolve isso (dados ficam na nuvem do Supabase).
2. **Aba do artigo**: `bloqueios` e `configuracoes` são chaves textuais — não têm sequence no
   Postgres (não referenciar `<tabela>_id_seq` delas no GRANT).
3. **Login (Supabase Auth)**: e-mail + senha; se digitar `lenice` sem @, vira `lenicebraga@hotmail.com`.
4. `api-client.js` manteve a MESMA interface `API.*`, então `lm-script.js`/`admin-script.js` 
   não precisaram de mudanças (só o `admin.html` trocou o rótulo do login para e-mail).
5. **Galerias 100% no Supabase** (desde set/2026): os carrosséis de avaliações/eventos/estações
   renderizam só a tabela `fotos` (o JS limpa o `<div>` antes de montar). O seed das 21 fotos
   originais (4 avaliações, 13 eventos, 4 estações) foi feito via script. Adicionar/remover fotos
   pelo painel atualiza o site na hora. Nomes de arquivo no storage não podem ter acento/ç
   ("Invalid key" do Supabase) — isso inclui uploads futuros pelo painel.

## Pendente / Próximos passos
- Comprar domínio (ex: lmartesfestas.com.br) e configurar no Netlify
- Trocar senha inicial do painel (Configurações) p/ uma só da Lenice
- Gerar QR Code do PIX (chave: lenicebraga@hotmail.com) e colocar na seção de pagamento
- Cópia do projeto fora deste repo (ex: Dropbox) já foi apagada — manter tudo só no Git/GitHub

## Contato
- Cliente: Lenice | WhatsApp: 21985412860 | Email: lenicebraga@hotmail.com