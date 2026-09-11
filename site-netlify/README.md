# L&M Artes e Festas — Versão Gratuita (Netlify + Supabase)

Site 100% gratuito: hospedado no **Netlify** (plano grátis) com **Supabase** (plano grátis)
para login do painel, promoções, pedidos e fotos enviadas pelo painel.

## Como publicar no Netlify (arrasta e solta)

1. Abra https://app.netlify.com/drop e arraste a pasta `site-netlify/` inteira
   para dentro da página. O Netlify publica em segundos e mostra o endereço
   `https://xxxx.netlify.app`.
2. **Para atualizar** depois de mexer nos arquivos: arraste de novo (ou conecte o
   GitHub para deploy automático a cada `git push`).

## Antes de publicar (uma vez só)

1. Criei o banco no Supabase colando o conteúdo de `supabase-schema.sql`
   no **SQL Editor** (Dashboard > SQL Editor > New query > Run).
2. Coloque no arquivo `config.js`:
   - `window.SUPABASE_URL` = Project URL (Dashboard > Project Settings > API)
   - `window.SUPABASE_ANON_KEY` = Publishable key (mesma tela)
3. Salve e arraste a pasta pro Netlify.

## Login do painel (admin.html)

- E-mail: `lenicebraga@hotmail.com` (ou digite só `lenice`)
- Senha inicial: combinada com o Arnaldo (troque no painel, em "Trocar senha")
- Para redefinir a senha se esquecer: Dashboard > Authentication > Users >
  botão ... do usuário > Reset password (o Supabase envia e-mail de redefinição).

## O que mudou em relação ao site antigo

- Painel admin, promoções, pedidos e bloqueios continuam funcionando (agora no Supabase).
- Fotos dos carrosséis de eventos/estações/avaliações são os arquivos locais da pasta
  `imagem/` (edite trocando os arquivos); fotos extras enviadas pelo painel ficam no
  storage do Supabase.
- Pagamento: só PIX. O pedido vai direto pro WhatsApp de Lenice.
- Sem servidor próprio: nada é apagado em deploys (fim do problema do Render).

## Arquivos para editar sem painel

- Preços/WhatsApp/PIX: seções "configurações" do banco Supabase ou pelo painel (Configurações).