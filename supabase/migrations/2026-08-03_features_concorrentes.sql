-- ============================================================
-- Fase 2 — colunas e tabelas para unidade, desconto, categorias
-- customizadas e lojas.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Só ADICIONA. Nenhum drop de tabela, nenhum drop de coluna,
-- nenhum dado apagado. As policies removidas com "drop policy
-- if exists" são recriadas logo abaixo, iguais.
--
-- Rodar no SQL Editor do Supabase.
-- ============================================================

-- --- Unidade e desconto nos itens -------------------------------
alter table public.list_items
  add column if not exists unidade  text    not null default 'un',
  add column if not exists desconto numeric not null default 0;

alter table public.list_items
  drop constraint if exists list_items_desconto_check;
alter table public.list_items
  add constraint list_items_desconto_check check (desconto >= 0);

-- --- Categorias por usuário -------------------------------------
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  icone      text not null default 'pricetag-outline',
  cor        text not null default '#6c757d',
  ordem      smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
create index if not exists categorias_user_idx on public.categorias(user_id);

alter table public.categorias enable row level security;

drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias
  for select to authenticated using (user_id = auth.uid());

drop policy if exists categorias_insert on public.categorias;
create policy categorias_insert on public.categorias
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists categorias_update on public.categorias;
create policy categorias_update on public.categorias
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists categorias_delete on public.categorias;
create policy categorias_delete on public.categorias
  for delete to authenticated using (user_id = auth.uid());

-- --- Lojas ------------------------------------------------------
create table if not exists public.lojas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  cor        text not null default '#3880ff',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
create index if not exists lojas_user_idx on public.lojas(user_id);

alter table public.lojas enable row level security;

drop policy if exists lojas_select on public.lojas;
create policy lojas_select on public.lojas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists lojas_insert on public.lojas;
create policy lojas_insert on public.lojas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists lojas_update on public.lojas;
create policy lojas_update on public.lojas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lojas_delete on public.lojas;
create policy lojas_delete on public.lojas
  for delete to authenticated using (user_id = auth.uid());

-- --- Loja no histórico de preços e nas listas arquivadas --------
alter table public.historico_precos
  add column if not exists loja_id uuid references public.lojas(id) on delete set null;

alter table public.archived_lists
  add column if not exists loja_id uuid references public.lojas(id) on delete set null;

create index if not exists historico_precos_loja_idx
  on public.historico_precos(user_id, nome_normalizado, loja_id, data desc);
