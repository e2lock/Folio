create table if not exists transactions (
  id text primary key,
  merchant text not null,
  note text not null default '',
  amount numeric not null check (amount > 0),
  kind text not null check (kind in ('expense', 'income')),
  category text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date desc);

alter table transactions enable row level security;

drop policy if exists "folio_public_access" on transactions;

create policy "folio_public_access"
  on transactions
  for all
  using (true)
  with check (true);
