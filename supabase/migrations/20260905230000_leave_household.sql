-- Non-owner members may remove themselves from a household (no direct table delete grant).

create or replace function private.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  member_role text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select role into member_role
  from public.household_members
  where user_id = uid;

  if member_role is null then
    raise exception 'not_in_household';
  end if;

  if member_role = 'owner' then
    raise exception 'owner_cannot_leave';
  end if;

  delete from public.household_members where user_id = uid;
end;
$$;

create or replace function public.leave_household()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.leave_household();
$$;

revoke all on function private.leave_household() from public, anon;
revoke all on function public.leave_household() from public, anon;
grant execute on function private.leave_household() to authenticated;
grant execute on function public.leave_household() to authenticated;
