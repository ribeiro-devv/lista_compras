-- ============================================================================
--  LISTA DE COMPRAS — Schema Supabase (PostgreSQL)
-- ----------------------------------------------------------------------------
--  Como usar:
--    1. Crie um projeto em https://supabase.com
--    2. Abra o "SQL Editor" do projeto
--    3. Cole TODO este arquivo e clique em "Run"
--    4. Em Authentication → Providers, habilite "Email" (com senha)
--    5. Copie URL e anon key (Project Settings → API) para environment.ts
--
--  Este script é idempotente o suficiente para rodar novamente (usa IF NOT
--  EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELAS
-- ----------------------------------------------------------------------------

-- Perfil do usuário (espelha auth.users)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  photo_url    text,
  created_at   timestamptz not null default now()
);

-- Listas (pessoais e compartilhadas)
create table if not exists public.lists (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  owner_id              uuid not null references auth.users(id) on delete cascade,
  owner_email           text,
  is_personal           boolean not null default false,
  allow_members_edit    boolean not null default true,
  allow_members_delete  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists lists_owner_idx on public.lists(owner_id);

-- Membros de cada lista
create table if not exists public.list_members (
  list_id   uuid not null references public.lists(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  email     text,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists list_members_user_idx on public.list_members(user_id);

-- Itens de uma lista
create table if not exists public.list_items (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.lists(id) on delete cascade,
  codigo         integer not null default 1,
  tarefa         text not null,
  quantidade     numeric not null default 0,
  valor_unitario numeric not null default 0,
  feito          boolean not null default false,
  categoria      text,
  criado_por     uuid references auth.users(id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists list_items_list_idx on public.list_items(list_id);

-- Convites para listas compartilhadas
create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null references public.lists(id) on delete cascade,
  list_name       text,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  owner_email     text,
  invited_email   text not null,
  invited_user_id uuid references auth.users(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  token           text,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create index if not exists invitations_email_idx on public.invitations(invited_email);

-- Histórico (listas arquivadas) — por usuário
create table if not exists public.archived_lists (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  nome                 text not null,
  data_inicio          timestamptz,
  data_finalizacao     timestamptz not null default now(),
  total_gasto          numeric not null default 0,
  total_itens          integer not null default 0,
  percentual_concluido integer not null default 0,
  itens                jsonb not null default '[]'::jsonb,
  categorias           jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
create index if not exists archived_lists_user_idx on public.archived_lists(user_id);

-- ----------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (SECURITY DEFINER p/ evitar recursão nas policies RLS)
-- ----------------------------------------------------------------------------

create or replace function public.is_list_owner(_list_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.lists
    where id = _list_id and owner_id = _user_id
  );
$$;

create or replace function public.is_list_member(_list_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.list_members
    where list_id = _list_id and user_id = _user_id
  );
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Mantém updated_at / atualizado_em automaticamente
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_TABLE_NAME = 'list_items' then
    new.atualizado_em = now();
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lists_updated on public.lists;
create trigger trg_lists_updated before update on public.lists
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_list_items_updated on public.list_items;
create trigger trg_list_items_updated before update on public.list_items
  for each row execute function public.touch_updated_at();

-- Ao criar qualquer lista, adiciona o dono como membro 'owner'
create or replace function public.handle_new_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_members (list_id, user_id, email, role)
  values (new.id, new.owner_id, new.owner_email, 'owner')
  on conflict (list_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_list_created on public.lists;
create trigger on_list_created after insert on public.lists
  for each row execute function public.handle_new_list();

-- Ao registrar um novo usuário: cria profile + lista pessoal "Minha Lista"
-- (a membership do dono é criada automaticamente pelo trigger on_list_created)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.lists (name, owner_id, owner_email, is_personal)
  values ('Minha Lista', new.id, new.email, true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.lists          enable row level security;
alter table public.list_members   enable row level security;
alter table public.list_items     enable row level security;
alter table public.invitations    enable row level security;
alter table public.archived_lists enable row level security;

-- ---- profiles --------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---- lists -----------------------------------------------------------------
drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists
  for select to authenticated
  using (owner_id = auth.uid() or public.is_list_member(id, auth.uid()));

drop policy if exists lists_insert on public.lists;
create policy lists_insert on public.lists
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists lists_update on public.lists;
create policy lists_update on public.lists
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists lists_delete on public.lists;
create policy lists_delete on public.lists
  for delete to authenticated using (owner_id = auth.uid());

-- ---- list_members ----------------------------------------------------------
drop policy if exists list_members_select on public.list_members;
create policy list_members_select on public.list_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_list_owner(list_id, auth.uid())
    or public.is_list_member(list_id, auth.uid())
  );

drop policy if exists list_members_insert on public.list_members;
create policy list_members_insert on public.list_members
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_list_owner(list_id, auth.uid()));

drop policy if exists list_members_delete on public.list_members;
create policy list_members_delete on public.list_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_list_owner(list_id, auth.uid()));

-- ---- list_items ------------------------------------------------------------
drop policy if exists list_items_select on public.list_items;
create policy list_items_select on public.list_items
  for select to authenticated
  using (public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid()));

drop policy if exists list_items_insert on public.list_items;
create policy list_items_insert on public.list_items
  for insert to authenticated
  with check (public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid()));

drop policy if exists list_items_update on public.list_items;
create policy list_items_update on public.list_items
  for update to authenticated
  using (public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid()));

drop policy if exists list_items_delete on public.list_items;
create policy list_items_delete on public.list_items
  for delete to authenticated
  using (public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid()));

-- ---- invitations -----------------------------------------------------------
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select to authenticated
  using (owner_id = auth.uid() or lower(invited_email) = lower(auth.email()));

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_list_owner(list_id, auth.uid()));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
  for update to authenticated
  using (owner_id = auth.uid() or lower(invited_email) = lower(auth.email()));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete to authenticated using (owner_id = auth.uid());

-- ---- archived_lists --------------------------------------------------------
drop policy if exists archived_select on public.archived_lists;
create policy archived_select on public.archived_lists
  for select to authenticated using (user_id = auth.uid());

drop policy if exists archived_insert on public.archived_lists;
create policy archived_insert on public.archived_lists
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists archived_delete on public.archived_lists;
create policy archived_delete on public.archived_lists
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- REALTIME (sincronização em tempo real dos itens da lista)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'list_items'
  ) then
    alter publication supabase_realtime add table public.list_items;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- MEMÓRIA DE PREÇOS POR USUÁRIO (último preço pago por produto)
-- ----------------------------------------------------------------------------
create table if not exists public.precos_usuario (
  user_id          uuid not null references auth.users(id) on delete cascade,
  nome_normalizado text not null,
  nome             text not null,
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

-- ============================================================================
--  FIM
-- ============================================================================
