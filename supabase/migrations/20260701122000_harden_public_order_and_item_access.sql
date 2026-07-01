-- Remove public access to customer orders and direct item stock updates.

drop policy if exists "Public can update combined_orders" on public.combined_orders;
drop policy if exists "Public can insert combined_orders" on public.combined_orders;
drop policy if exists "Public can read combined_orders" on public.combined_orders;

drop policy if exists "Users can update their own combined orders" on public.combined_orders;
create policy "Users can update their own combined orders"
on public.combined_orders
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own combined orders" on public.combined_orders;
create policy "Users can read their own combined orders"
on public.combined_orders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own combined orders" on public.combined_orders;
create policy "Users can insert their own combined orders"
on public.combined_orders
for insert
to authenticated
with check ((select auth.uid()) = user_id or user_id is null);

drop policy if exists "Public can update items stock" on public.items;

create or replace function public.update_guest_order_contact(
  p_order_id text,
  p_customer_email text,
  p_customer_phone text default null,
  p_shipping_address text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.combined_orders
  set
    customer_phone = coalesce(nullif(trim(p_customer_phone), ''), customer_phone),
    shipping_address = coalesce(nullif(trim(p_shipping_address), ''), shipping_address),
    updated_at = now()
  where order_id = p_order_id
    and lower(customer_email) = lower(trim(p_customer_email))
    and user_id is null;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.update_guest_order_contact(text, text, text, text) from public;
grant execute on function public.update_guest_order_contact(text, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
