revoke all on table public.households from authenticated, anon, public;
grant select on table public.households to authenticated;

revoke all on table public.household_members from authenticated, anon, public;
grant select on table public.household_members to authenticated;

revoke all on table public.transactions from authenticated, anon, public;
grant select, insert, delete on table public.transactions to authenticated;
