-- Journals must be isolated. OR with using(true) made every ledger look shared.

drop policy if exists "allow all for now" on public.transactions;
drop policy if exists "folio_public_access" on public.transactions;

create or replace function private.current_household_id()
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  select a.household_id
  from private.user_active_household a
  inner join public.household_members m
    on m.household_id = a.household_id
   and m.user_id = a.user_id
  where a.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.list_named_journals()
returns json
language sql
volatile
security definer
set search_path = ''
as $$
  with mine as (
    select h.id, h.invite_code, h.name, m.role, h.created_at
    from public.household_members m
    inner join public.households h on h.id = m.household_id
    where m.user_id = auth.uid()
      and h.name in ('Егор', 'Надежда')
  ),
  cur as (
    select private.current_household_id() as id
  )
  select coalesce(
    (
      select json_agg(
        json_build_object(
          'id', mine.id,
          'invite_code', mine.invite_code,
          'name', mine.name,
          'role', mine.role,
          'active', mine.id = cur.id
        )
        order by mine.name
      )
      from mine
      cross join cur
    ),
    '[]'::json
  );
$$;
