-- Close the public ledger: auth + household of two, RLS on every table.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Folio',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_user_id_uidx
  on public.household_members (user_id);

alter table public.transactions
  add column if not exists household_id uuid references public.households (id) on delete cascade;

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, date desc);

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function private.current_household_id() from public, anon, authenticated;
grant execute on function private.current_household_id() to authenticated;

create or replace function private.set_transaction_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.household_id := private.current_household_id();
  if new.household_id is null then
    raise exception 'no_household';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_set_household on public.transactions;
create trigger transactions_set_household
  before insert on public.transactions
  for each row
  execute function private.set_transaction_household();

create or replace function private.create_household()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if exists (
    select 1 from public.household_members where user_id = auth.uid()
  ) then
    raise exception 'already_in_household';
  end if;

  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.households (invite_code) values (code) returning id into hid;
  insert into public.household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'owner');

  return json_build_object('id', hid, 'invite_code', code, 'role', 'owner');
end;
$$;

create or replace function private.join_household(invite text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if exists (
    select 1 from public.household_members where user_id = auth.uid()
  ) then
    raise exception 'already_in_household';
  end if;

  code := upper(trim(invite));
  select id into hid from public.households where invite_code = code;
  if hid is null then
    raise exception 'invalid_code';
  end if;
  if (select count(*) from public.household_members where household_id = hid) >= 2 then
    raise exception 'household_full';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'member');

  return json_build_object('id', hid, 'invite_code', code, 'role', 'member');
end;
$$;

create or replace function public.create_household()
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.create_household();
$$;

create or replace function public.join_household(invite text)
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.join_household(invite);
$$;

revoke all on function private.create_household() from public, anon;
revoke all on function private.join_household(text) from public, anon;
grant execute on function private.create_household() to authenticated;
grant execute on function private.join_household(text) to authenticated;

revoke all on function public.create_household() from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "folio_public_access" on public.transactions;

drop policy if exists households_select_own on public.households;
create policy households_select_own
  on public.households
  for select
  to authenticated
  using (id = private.current_household_id());

drop policy if exists members_select_own on public.household_members;
create policy members_select_own
  on public.household_members
  for select
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
  on public.transactions
  for select
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
  on public.transactions
  for insert
  to authenticated
  with check (household_id = private.current_household_id());

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own
  on public.transactions
  for delete
  to authenticated
  using (household_id = private.current_household_id());

revoke all on table public.households from anon, public;
revoke all on table public.household_members from anon, public;
revoke all on table public.transactions from anon, public;

grant select on table public.households to authenticated;
grant select on table public.household_members to authenticated;
grant select, insert, delete on table public.transactions to authenticated;
