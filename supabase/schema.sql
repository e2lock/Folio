-- Reference only. Live schema is applied from supabase/migrations/.
-- Access model: authenticated household members only. Anon has no table grants.

-- public.households, public.household_members, public.transactions,
-- public.accounts, public.planned_items
-- RLS: rows visible only when household_id = private.current_household_id()
-- Two named journals: Егор and Надежда. Cap per journal: 2. Active journal is server-side.
-- transactions.subcategory + account_id; accounts.opening_balance; planned_items synced.
