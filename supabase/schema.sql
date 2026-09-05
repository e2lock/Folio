-- Reference only. Live schema is applied from supabase/migrations/.
-- Access model: authenticated household members only. Anon has no table grants.

-- public.households, public.household_members, public.transactions
-- RLS: rows visible only when household_id = private.current_household_id()
-- Invite: first user calls create_household(); second calls join_household(code). Cap: 2.
