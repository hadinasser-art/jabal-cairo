-- Customers can read their own orders, but status/totals/tracking updates must be admin/service-side.

drop policy if exists "Users can update their own combined orders" on public.combined_orders;

notify pgrst, 'reload schema';
