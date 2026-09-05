-- The first two authenticated accounts automatically get both named journals.

create or replace function private.ensure_named_journals()
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n text;
  hid uuid;
  member_count int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  foreach n in array array['Егор', 'Надежда']::text[] loop
    select id into hid
    from public.households
    where name = n
    limit 1;

    if hid is null then
      insert into public.households (name, invite_code)
      values (n, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
      returning id into hid;
    end if;

    if not exists (
      select 1
      from public.household_members
      where household_id = hid and user_id = uid
    ) then
      perform 1 from public.households where id = hid for update;
      select count(*) into member_count
      from public.household_members
      where household_id = hid;

      if member_count >= 2 then
        raise exception 'household_full';
      end if;

      insert into public.household_members (household_id, user_id, role)
      values (hid, uid, case when member_count = 0 then 'owner' else 'member' end);
    end if;
  end loop;

  hid := private.current_household_id();
  if hid is null then
    select h.id into hid
    from public.households h
    inner join public.household_members m on m.household_id = h.id
    where m.user_id = uid and h.name = 'Егор'
    limit 1;

    if hid is not null then
      perform private.set_active_household(hid);
    end if;
  end if;

  return private.list_named_journals();
end;
$$;

revoke all on function private.ensure_named_journals() from public, anon;
grant execute on function private.ensure_named_journals() to authenticated;
