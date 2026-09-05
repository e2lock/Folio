-- Move legacy Folio ledger onto Егор and add empty Надежда for the same members.

do $$
declare
  folio_id uuid;
  egor_id uuid;
  nade_id uuid;
begin
  select id into folio_id from public.households where name = 'Folio' limit 1;
  select id into egor_id from public.households where name = 'Егор' limit 1;
  select id into nade_id from public.households where name = 'Надежда' limit 1;

  if folio_id is not null and egor_id is null then
    update public.households set name = 'Егор' where id = folio_id;
    egor_id := folio_id;
    folio_id := null;
  elsif folio_id is not null and egor_id is not null and folio_id <> egor_id then
    update public.transactions set household_id = egor_id where household_id = folio_id;
    insert into public.household_members (household_id, user_id, role)
    select egor_id, m.user_id, m.role
    from public.household_members m
    where m.household_id = folio_id
    on conflict (household_id, user_id) do nothing;
    delete from public.households where id = folio_id;
  end if;

  if nade_id is null then
    insert into public.households (name, invite_code)
    values ('Надежда', upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
    returning id into nade_id;
  end if;

  if egor_id is not null and nade_id is not null then
    insert into public.household_members (household_id, user_id, role)
    select nade_id, m.user_id, m.role
    from public.household_members m
    where m.household_id = egor_id
    on conflict (household_id, user_id) do nothing;
  end if;
end
$$;
