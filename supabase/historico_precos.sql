-- ============================================================================
--  MIGRAÇÃO INCREMENTAL: histórico de preços por item
--  Rode no SQL Editor do Supabase. Idempotente.
--  Guarda cada preço pago ao longo do tempo (para ver a evolução do item).
-- ============================================================================

create table if not exists public.historico_precos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  nome_normalizado text not null,
  nome             text not null,
  valor            numeric not null default 0,
  data             timestamptz not null default now()
);
create index if not exists historico_precos_idx
  on public.historico_precos(user_id, nome_normalizado, data desc);

alter table public.historico_precos enable row level security;

drop policy if exists hprecos_select on public.historico_precos;
create policy hprecos_select on public.historico_precos
  for select to authenticated using (user_id = auth.uid());

drop policy if exists hprecos_insert on public.historico_precos;
create policy hprecos_insert on public.historico_precos
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists hprecos_delete on public.historico_precos;
create policy hprecos_delete on public.historico_precos
  for delete to authenticated using (user_id = auth.uid());
