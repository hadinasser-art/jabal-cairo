-- Allow admins to safely update product variant stock from the dashboard.

create or replace function public.admin_update_variant_stock(
  p_variant_id uuid,
  p_stock_quantity integer
)
returns table (
  variant_id uuid,
  item_id uuid,
  product_name text,
  color text,
  size text,
  stock_quantity integer,
  product_stock_quantity integer,
  product_sold_out boolean,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_variant_id is null then
    raise exception 'Variant id is required';
  end if;

  if p_stock_quantity is null or p_stock_quantity < 0 then
    raise exception 'Stock quantity must be zero or more';
  end if;

  update public.product_variants pv
  set stock_quantity = p_stock_quantity
  where pv.id = p_variant_id;

  if not found then
    raise exception 'Variant not found';
  end if;

  return query
  select
    pv.id as variant_id,
    pv.item_id,
    i.name as product_name,
    pv.color,
    pv.size,
    pv.stock_quantity,
    i.stock_quantity as product_stock_quantity,
    i.sold_out as product_sold_out,
    pv.updated_at
  from public.product_variants pv
  join public.items i on i.id = pv.item_id
  where pv.id = p_variant_id;
end;
$$;

revoke execute on function public.admin_update_variant_stock(uuid, integer)
  from public, anon;
grant execute on function public.admin_update_variant_stock(uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
