# L&M Artes e Festas — Site Grátis (Netlify)

Versão **estática** do site da L&M, feita para hospedagem **100% gratuita**.
Não precisa de servidor, banco de dados, painel admin nem cartão de pagamento.

## O que mudou em relação à versão antiga

| | Versão antiga (paga) | Versão nova (grátis) |
|---|---|---|
| Hospedagem | Render ($7/mês) + domínio (~R$40/ano) | Netlify / GitHub Pages (grátis) |
| Backend | Node.js + SQLite | Nenhum (site 100% estático) |
| Painel admin | Sim | Não |
| Pagamento | PIX + cartão (Mercado Pago) | Só PIX |
| Pedido | Salvo no banco + pagamento online | Vai direto pro WhatsApp da Lenice |
| Preços | Editáveis no admin | Fixos no código (editar arquivos) |

## Como funciona o pedido

1. O cliente monta a equipe e as estações no site (os preços já estão fixos).
2. No final, aparece a chave PIX e um botão para copiar.
3. Ao clicar em "Finalizar Pedido", abre o WhatsApp da Lenice com todos os detalhes já preenchidos.
4. O cliente faz o PIX e manda o comprovante pelo WhatsApp.

## Arquivos

- `index.html` — a página inteira do site
- `lm-script.js` — a lógica (pedidos, resumo, envio pro WhatsApp)
- `lm-style.css` — o visual
- `imagem/` — fotos, logo e ícones

## Como editar (sem painel admin)

Para mudar qualquer coisa, basta abrir o arquivo com um editor de texto e salvar:

- **Preços**: em `lm-script.js`, dentro de `var precos = { ... }` (troque os números).
- **Chave PIX**: em `lm-script.js`, `var chavePix = 'lenicebraga@hotmail.com'`.
- **WhatsApp**: em `lm-script.js`, `var numeroWhatsApp = '5521985412860'`.
- **Texto/fotos da página**: em `index.html`.
- Depois é só enviar o arquivo atualizado de novo para o Netlify.

## Como colocar no ar (Netlify — arrasta e solta)

1. Crie uma conta grátis em **https://app.netlify.com** (pode entrar com Google).
2. Clique em **"Add new site" → "Deploy manually"** (publicar manualmente).
3. Arraste a **pasta** `site-netlify` (a que contém `index.html`) para a área de upload.
4. Pronto! O site fica disponível em um endereço grátis como: **https://seu-nome.netlify.app**

> Para trocar o endereço: Configurações do site → Domain management → mudar o subdomínio.

## Testar antes de publicar

Abra o arquivo `index.html` direto no navegador (dê 2 cliques nele). O site funciona
completamente sem servidor, então o que você vê localmente é o que vai pro ar.
