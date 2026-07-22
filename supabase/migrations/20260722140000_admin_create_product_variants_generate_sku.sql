-- Auto-generate a SKU when creating variants for a new color, instead of
-- leaving it null. Every existing product follows a "PREFIX-COLOR-SIZE"
-- convention; since the exact per-product prefix abbreviation isn't stored
-- anywhere, derive a readable one from the product name so new colors never
-- ship without a SKU.

create or replace function public.admin_create_product_variants(
  p_item_id uuid,
  p_color text,
  p_sizes text[]
)
returns table (
  variant_id uuid,
  item_id uuid,
  color text,
  size text,
  stock_quantity integer,
  sku text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_color text;
  v_name_slug text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  v_color := nullif(trim(p_color), '');
  if v_color is null then
    raise exception 'Color is required';
  end if;

  if p_sizes is null or array_length(p_sizes, 1) is null then
    raise exception 'At least one size is required';
  end if;

  select upper(trim(both '-' from regexp_replace(i.name, '[^a-zA-Z0-9]+', '-', 'g')))
  into v_name_slug
  from public.items i
  where i.id = p_item_id;

  if v_name_slug is null then
    raise exception 'Product not found';
  end if;

  insert into public.product_variants (item_id, color, size, stock_quantity, sku)
  select
    p_item_id,
    v_color,
    nullif(trim(s), ''),
    0,
    'JBL-' || v_name_slug || '-'
      || upper(trim(both '-' from regexp_replace(v_color, '[^a-zA-Z0-9]+', '-', 'g')))
      || '-' || upper(trim(both '-' from regexp_replace(nullif(trim(s), ''), '[^a-zA-Z0-9]+', '-', 'g')))
  from unnest(p_sizes) as s
  where nullif(trim(s), '') is not null
  on conflict (item_id, color, size) do nothing;

  return query
  select
    pv.id as variant_id,
    pv.item_id,
    pv.color,
    pv.size,
    pv.stock_quantity,
    pv.sku,
    pv.updated_at
  from public.product_variants pv
  where pv.item_id = p_item_id and pv.color = v_color;
end;
$$;

revoke execute on function public.admin_create_product_variants(uuid, text, text[])
  from public, anon;
grant execute on function public.admin_create_product_variants(uuid, text, text[])
  to authenticated;

notify pgrst, 'reload schema';
