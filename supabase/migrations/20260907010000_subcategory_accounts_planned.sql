-- Subcategories on ledger rows, household accounts with opening balance,
-- and planned items synced across devices. Access stays household-scoped.

alter table public.transactions
  add column if not exists subcategory text;

alter table public.transactions
  add constraint transactions_subcategory_len
  check (subcategory is null or char_length(subcategory) <= 64);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  opening_balance numeric not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint accounts_name_len check (char_length(trim(name)) between 1 and 48)
);

create unique index if not exists accounts_one_default_per_household
  on public.accounts (household_id)
  where is_default;

create index if not exists accounts_household_idx
  on public.accounts (household_id, created_at);

alter table public.transactions
  add column if not exists account_id uuid references public.accounts (id) on delete set null;

create index if not exists transactions_account_idx
  on public.transactions (account_id);

create table if not exists public.planned_items (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0),
  kind text not null check (kind in ('expense', 'income')),
  category text not null,
  subcategory text,
  date date,
  created_at timestamptz not null default now(),
  constraint planned_items_name_len check (char_length(trim(name)) between 1 and 48),
  constraint planned_items_subcategory_len check (subcategory is null or char_length(subcategory) <= 64)
);

create index if not exists planned_items_household_date_idx
  on public.planned_items (household_id, date desc);

create or replace function private.set_transaction_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id is null then
    new.household_id := private.current_household_id();
  end if;
  if new.household_id is null then
    raise exception 'no_household';
  end if;
  return new;
end;
$$;

create or replace function private.ensure_default_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (household_id, name, opening_balance, is_default)
  values (new.id, 'Основной счёт', 0, true);
  return new;
end;
$$;

revoke all on function private.ensure_default_account() from public, anon, authenticated;

drop trigger if exists households_default_account on public.households;
create trigger households_default_account
  after insert on public.households
  for each row
  execute function private.ensure_default_account();

drop trigger if exists accounts_set_household on public.accounts;
create trigger accounts_set_household
  before insert on public.accounts
  for each row
  execute function private.set_transaction_household();

drop trigger if exists planned_items_set_household on public.planned_items;
create trigger planned_items_set_household
  before insert on public.planned_items
  for each row
  execute function private.set_transaction_household();

insert into public.accounts (household_id, name, opening_balance, is_default)
select h.id, 'Основной счёт', 0, true
from public.households h
where not exists (
  select 1 from public.accounts a where a.household_id = h.id
);

alter table public.accounts enable row level security;
alter table public.planned_items enable row level security;

drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own
  on public.accounts
  for select
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own
  on public.accounts
  for insert
  to authenticated
  with check (household_id = private.current_household_id());

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own
  on public.accounts
  for update
  to authenticated
  using (household_id = private.current_household_id())
  with check (household_id = private.current_household_id());

drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_delete_own
  on public.accounts
  for delete
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists planned_items_select_own on public.planned_items;
create policy planned_items_select_own
  on public.planned_items
  for select
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists planned_items_insert_own on public.planned_items;
create policy planned_items_insert_own
  on public.planned_items
  for insert
  to authenticated
  with check (household_id = private.current_household_id());

drop policy if exists planned_items_delete_own on public.planned_items;
create policy planned_items_delete_own
  on public.planned_items
  for delete
  to authenticated
  using (household_id = private.current_household_id());

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own
  on public.transactions
  for update
  to authenticated
  using (household_id = private.current_household_id())
  with check (household_id = private.current_household_id());

revoke all on table public.accounts from anon, public;
revoke all on table public.planned_items from anon, public;

grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, delete on table public.planned_items to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
