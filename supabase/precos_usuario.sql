-- ============================================================================
--  MIGRAÇÃO INCREMENTAL: memória de preços por usuário
--  Rode este bloco no SQL Editor do Supabase (além do schema.sql principal).
--  Idempotente: pode rodar de novo sem problema.
-- ============================================================================

-- Guarda o ÚLTIMO preço que cada usuário pagou por cada produto (por nome).
create table if not exists public.precos_usuario (
  user_id          uuid not null references auth.users(id) on delete cascade,
  nome_normalizado text not null,             -- nome em minúsculo, sem espaços nas pontas
  nome             text not null,             -- nome para exibição
  valor            numeric not null default 0,
  atualizado_em    timestamptz not null default now(),
  primary key (user_id, nome_normalizado)
);

alter table public.precos_usuario enable row level security;

drop policy if exists precos_select on public.precos_usuario;
create policy precos_select on public.precos_usuario
  for select to authenticated using (user_id = auth.uid());

drop policy if exists precos_upsert on public.precos_usuario;
create policy precos_upsert on public.precos_usuario
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists precos_update on public.precos_usuario;
create policy precos_update on public.precos_usuario
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists precos_delete on public.precos_usuario;
create policy precos_delete on public.precos_usuario
  for delete to authenticated using (user_id = auth.uid());
