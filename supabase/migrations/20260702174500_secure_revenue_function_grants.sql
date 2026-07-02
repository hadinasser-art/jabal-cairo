-- Keep revenue helper functions private to database triggers/admin roles.

revoke execute on function public.apply_revenue_delta(date, numeric, integer)
  from anon, authenticated, public;

revoke execute on function public.sync_revenue_from_combined_order()
  from anon, authenticated, public;

notify pgrst, 'reload schema';
