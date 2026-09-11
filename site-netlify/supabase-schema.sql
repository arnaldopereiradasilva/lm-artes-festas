-- ============================================================
-- L&M Artes e Festas - Supabase (rodar tudo no SQL Editor)
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- TABELAS ----------
create table if not exists public.configuracoes (
  chave   text primary key,
  valor   text not null
);

create table if not exists public.promocoes (
  id        bigserial primary key,
  titulo    text not null,
  subtitulo text default '',
  preco     text default '',
  imagem    text default '',
  ativo     boolean default true,
  ordem     int default 0,
  criado_em timestamptz default now()
);

create table if not exists public.pedidos (
  id                bigserial primary key,
  numero_pedido     text unique not null,
  cliente_nome      text not null,
  cliente_whatsapp  text not null,
  cliente_email     text not null,
  cliente_cpf       text not null,
  evento_data       text not null,
  evento_horario    text not null,
  evento_duracao    text not null,
  evento_endereco   text not null,
  evento_convidados int not null,
  equipe            text not null,
  estacoes          text,
  pagamento         text not null,
  total             real not null,
  status            text default 'pendente',
  criado_em         timestamptz default now(),
  atualizado_em     timestamptz default now()
);

create table if not exists public.bloqueios (
  data      text primary key,
  motivo    text default 'Sem motivo',
  criado_em timestamptz default now()
);

create table if not exists public.fotos (
  id        bigserial primary key,
  tipo      text not null,
  caminho   text not null,
  ordem     int default 0,
  criado_em timestamptz default now()
);

-- ---------- CONFIGURACOES PADRAO ----------
insert into public.configuracoes (chave, valor) values
  ('whatsapp','5521985412860'),
  ('email','lenicebraga@hotmail.com'),
  ('pix','lenicebraga@hotmail.com'),
  ('max_eventos_por_dia','5'),
  ('preco_garcom','180'),
  ('preco_copeira','160'),
  ('preco_fritadeira','150'),
  ('preco_churrasqueiro','220'),
  ('preco_monitora','140'),
  ('preco_recepcionista','160'),
  ('preco_pipoca','120'),
  ('preco_algodao','130'),
  ('preco_acai','200'),
  ('preco_sorvete','180'),
  ('preco_batata','150'),
  ('preco_crepe','160'),
  ('preco_suco','140'),
  ('equipe_base_local','Av. do Contorno, 129 - Paciência - CEP 23585-808')
on conflict (chave) do nothing;

-- ---------- PROMOCOES INICIAIS ----------
insert into public.promocoes (titulo, subtitulo, preco, ativo, ordem) values
  ('Combo Aniversario', 'Bolo da festa incluso + 2 profissionais por 5 horas', 'A partir de R$ 900', true, 1),
  ('Pacote Infantil', 'Garcom + monitora + maquina de algodao doce', 'A partir de R$ 1.190', true, 2)
on conflict do nothing;

-- ---------- PERMISSOES DAS FUNCOES DA API ----------
grant usage on schema public to anon, authenticated;
grant all on public.configuracoes, public.promocoes, public.pedidos, public.bloqueios, public.fotos to authenticated;
grant select on public.configuracoes, public.promocoes, public.bloqueios, public.fotos to anon;
grant insert on public.pedidos to anon;
grant usage on sequence
  public.pedidos_id_seq, public.promocoes_id_seq, public.fotos_id_seq
  to anon, authenticated;

-- ---------- RLS ----------
alter table public.configuracoes enable row level security;
alter table public.promocoes     enable row level security;
alter table public.pedidos       enable row level security;
alter table public.bloqueios     enable row level security;
alter table public.fotos         enable row level security;

-- config: leitura publica, alteracao so logada
drop policy if exists config_public_select on public.configuracoes;
drop policy if exists config_auth_all on public.configuracoes;
create policy config_public_select on public.configuracoes for select using (true);
create policy config_auth_all on public.configuracoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- promocoes: publico ve so as ativas, admin gerencia tudo
drop policy if exists promo_public_select on public.promocoes;
drop policy if exists promo_auth_all on public.promocoes;
create policy promo_public_select on public.promocoes for select using (ativo = true);
create policy promo_auth_all on public.promocoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- pedidos: qualquer visitante pode cadastrar, so admin consulta/altera
drop policy if exists pedido_anon_insert on public.pedidos;
drop policy if exists pedido_auth_all on public.pedidos;
create policy pedido_anon_insert on public.pedidos for insert with check (true);
create policy pedido_auth_all on public.pedidos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- bloqueios: publico le, admin gerencia
drop policy if exists bloqueio_public_select on public.bloqueios;
drop policy if exists bloqueio_auth_all on public.bloqueios;
create policy bloqueio_public_select on public.bloqueios for select using (true);
create policy bloqueio_auth_all on public.bloqueios for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- fotos: publico ve, admin gerencia
drop policy if exists fotos_public_select on public.fotos;
drop policy if exists fotos_auth_all on public.fotos;
create policy fotos_public_select on public.fotos for select using (true);
create policy fotos_auth_all on public.fotos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- ARMAZENAMENTO DE IMAGENS ----------
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists imagens_public_select on storage.objects;
drop policy if exists imagens_auth_insert on storage.objects;
drop policy if exists imagens_auth_delete on storage.objects;
create policy imagens_public_select on storage.objects
  for select using (bucket_id = 'imagens');
create policy imagens_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'imagens');
create policy imagens_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'imagens');

-- ---------- USUARIO ADMIN ----------
-- Ja criado no banco atual. Se precisar recriar em um projeto novo, crie pelo painel:
--   Authentication > Users > Add user (e-mail lenicebraga@hotmail.com + senha de sua escolha)
-- Ou rode no SQL Editor:
--   insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, created_at, updated_at,
--     confirmation_token, recovery_token, email_change_token_new, email_change,
--     raw_app_meta_data, raw_user_meta_data)
--   select '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
--     'authenticated', 'authenticated', 'lenicebraga@hotmail.com',
--     crypt('SUA_SENHA_AQUI', gen_salt('bf')), now(), now(), now(), '', '', '', '',
--     '{"provider":"email","providers":["email"]}', '{}'
--   where not exists (select 1 from auth.users where email = 'lenicebraga@hotmail.com');

-- ============================================================
-- FIM. Se rodou sem erro, o banco esta pronto.
-- ============================================================