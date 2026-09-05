-- Several journals per user. Active journal is server-side; inserts still get household_id from current_household_id().

drop index if exists public.household_members_user_id_uidx;

create table if not exists private.user_active_household (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade
);

revoke all on table private.user_active_household from public, anon, authenticated;

insert into private.user_active_household (user_id, household_id)
select distinct on (user_id) user_id, household_id
from public.household_members
order by user_id, created_at
on conflict (user_id) do nothing;

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select a.household_id
      from private.user_active_household a
      inner join public.household_members m
        on m.household_id = a.household_id
       and m.user_id = a.user_id
      where a.user_id = auth.uid()
    ),
    (
      select m.household_id
      from public.household_members m
      where m.user_id = auth.uid()
      order by m.created_at
      limit 1
    )
  );
$$;

create or replace function private.set_active_household(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if target is null or not exists (
    select 1 from public.household_members
    where household_id = target and user_id = auth.uid()
  ) then
    raise exception 'not_in_household';
  end if;
  insert into private.user_active_household (user_id, household_id)
  values (auth.uid(), target)
  on conflict (user_id) do update set household_id = excluded.household_id;
end;
$$;

create or replace function private.journal_name(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(left(trim(coalesce(raw, '')), 40), ''), 'Folio');
$$;

drop function if exists public.create_household();
drop function if exists private.create_household();

create or replace function private.create_household(journal_name text default 'Folio')
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  code text;
  n text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  n := private.journal_name(journal_name);
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.households (name, invite_code) values (n, code) returning id into hid;
  insert into public.household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'owner');
  perform private.set_active_household(hid);

  return json_build_object('id', hid, 'invite_code', code, 'name', n, 'role', 'owner', 'active', true);
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
  n text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  code := upper(trim(invite));
  select id, name into hid, n from public.households where invite_code = code;
  if hid is null then
    raise exception 'invalid_code';
  end if;

  if exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  ) then
    perform private.set_active_household(hid);
    return json_build_object('id', hid, 'invite_code', code, 'name', n, 'role', (
      select role from public.household_members where household_id = hid and user_id = auth.uid()
    ), 'active', true);
  end if;

  if (select count(*) from public.household_members where household_id = hid) >= 2 then
    raise exception 'household_full';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (hid, auth.uid(), 'member');
  perform private.set_active_household(hid);

  return json_build_object('id', hid, 'invite_code', code, 'name', n, 'role', 'member', 'active', true);
end;
$$;

create or replace function private.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  remaining uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  hid := private.current_household_id();
  if hid is null or not exists (
    select 1 from public.household_members where household_id = hid and user_id = uid
  ) then
    raise exception 'not_in_household';
  end if;

  delete from public.household_members where household_id = hid and user_id = uid;
  delete from private.user_active_household where user_id = uid and household_id = hid;

  select user_id into remaining
  from public.household_members
  where household_id = hid
  limit 1;

  if remaining is null then
    delete from public.households where id = hid;
  else
    update public.household_members
      set role = 'owner'
      where household_id = hid and user_id = remaining;
  end if;

  select household_id into hid
  from public.household_members
  where user_id = uid
  order by created_at
  limit 1;

  if hid is not null then
    perform private.set_active_household(hid);
  end if;
end;
$$;

create or replace function private.list_households()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select h.id, h.invite_code, h.name, m.role, h.created_at
    from public.household_members m
    inner join public.households h on h.id = m.household_id
    where m.user_id = auth.uid()
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
        order by mine.created_at
      )
      from mine
      cross join cur
    ),
    '[]'::json
  );
$$;

drop policy if exists households_select_own on public.households;
create policy households_select_own
  on public.households
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members m
      where m.household_id = households.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists members_select_own on public.household_members;
create policy members_select_own
  on public.household_members
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.create_household(journal_name text default 'Folio')
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.create_household(journal_name);
$$;

create or replace function public.join_household(invite text)
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.join_household(invite);
$$;

create or replace function public.leave_household()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.leave_household();
$$;

create or replace function public.set_active_household(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_active_household(target);
$$;

create or replace function public.list_households()
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.list_households();
$$;

revoke all on function private.journal_name(text) from public, anon, authenticated;
revoke all on function private.set_active_household(uuid) from public, anon;
revoke all on function private.list_households() from public, anon;
revoke all on function private.create_household(text) from public, anon;
revoke all on function private.join_household(text) from public, anon;
revoke all on function private.leave_household() from public, anon;

grant execute on function private.set_active_household(uuid) to authenticated;
grant execute on function private.list_households() to authenticated;
grant execute on function private.create_household(text) to authenticated;
grant execute on function private.join_household(text) to authenticated;
grant execute on function private.leave_household() to authenticated;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.leave_household() from public, anon;
revoke all on function public.set_active_household(uuid) from public, anon;
revoke all on function public.list_households() from public, anon;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.set_active_household(uuid) to authenticated;
grant execute on function public.list_households() to authenticated;
