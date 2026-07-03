-- Consolidate product variant sync work, optimize RLS policies, add FK indexes,
-- and remove the retired email log table.

create or replace function public.sync_item_from_variants()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_item_id uuid;
  next_sizes text[];
  next_colors text[];
  total_stock integer;
begin
  target_item_id := coalesce(new.item_id, old.item_id);

  select
    coalesce(array_agg(distinct size order by size), array[]::text[]),
    coalesce(array_agg(distinct color order by color), array[]::text[]),
    coalesce(sum(stock_quantity), 0)::integer
  into next_sizes, next_colors, total_stock
  from public.product_variants
  where item_id = target_item_id;

  update public.items
  set
    size = next_sizes,
    color = next_colors,
    stock_quantity = total_stock,
    sold_out = (total_stock <= 0)
  where id = target_item_id;

  return null;
end;
$function$;

drop trigger if exists trg_sync_item_stock_from_variants on public.product_variants;
drop function if exists public.sync_item_stock_from_variants();

alter policy "Users can read their own customer profile"
  on public.customer_profiles
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own customer profile"
  on public.customer_profiles
  with check ((select auth.uid()) = user_id);

alter policy "Users can update their own customer profile"
  on public.customer_profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can read combined orders" on public.combined_orders;
drop policy if exists "Users can read their own combined orders" on public.combined_orders;

create policy "Admins and owners can read combined orders"
  on public.combined_orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id or is_admin());

create index if not exists combined_orders_offer_id_idx
  on public.combined_orders (offer_id);

create index if not exists favorites_item_id_idx
  on public.favorites (item_id);

create index if not exists favorites_variant_id_idx
  on public.favorites (variant_id);

drop table if exists public.email_logs;

notify pgrst, 'reload schema';
