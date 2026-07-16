-- Add the green colorway to the existing men's Drop Shoulder product.

do $$
declare
  dropshoulder_id uuid := 'cb3e831b-6288-4dc2-8b04-72e64e258eca'::uuid;
  green_front_url text := 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/green/front.png';
begin
  update public.items
  set
    color = case
      when not ('Green' = any(color)) then array_append(color, 'Green')
      else color
    end,
    color_order = case
      when not ('Green' = any(color_order)) then array_append(color_order, 'Green')
      else color_order
    end
  where id = dropshoulder_id;

  delete from public.product_media
  where item_id = dropshoulder_id
    and color = 'Green';

  insert into public.product_media (item_id, color, label, url, kind, sort_order)
  values
    (dropshoulder_id, 'Green', 'Front', green_front_url, 'gallery', 10),
    (dropshoulder_id, 'Green', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/green/side.png', 'gallery', 20),
    (dropshoulder_id, 'Green', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/green/back.png', 'gallery', 30);

  insert into public.product_variants (item_id, color, size, stock_quantity, image_url, sku)
  select
    dropshoulder_id,
    'Green',
    size_name,
    10,
    green_front_url,
    'JBL-DROP-SHOULDER-GREEN-' || size_name
  from unnest(array['S', 'M', 'L', 'XL', 'XXL']) as sizes(size_name)
  on conflict (item_id, color, size) do update
  set
    image_url = excluded.image_url,
    sku = excluded.sku;
end $$;
