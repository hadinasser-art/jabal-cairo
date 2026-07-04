-- Add the newly uploaded men's polo and drop shoulder products.

do $$
declare
  polo_id uuid := '25d5f2a2-df8d-4bb9-a99d-8914d9d6ef7b'::uuid;
  dropshoulder_id uuid := 'cb3e831b-6288-4dc2-8b04-72e64e258eca'::uuid;
begin
  insert into public.items (
    id,
    name,
    description,
    price_egp,
    image_url,
    category,
    size,
    color,
    stock_quantity,
    sold_out,
    gender,
    color_order
  )
  values
    (
      polo_id,
      'Jabal Polo Shirt',
      'Men''s polo shirt with a relaxed everyday fit.',
      650,
      'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/front.png',
      'polo shirts',
      array['S', 'M', 'L', 'XL', 'XXL'],
      array['Sage', 'Gray', 'Burgundy', 'Blue', 'Dark Blue', 'Black'],
      0,
      true,
      'mens',
      array['Sage', 'Gray', 'Burgundy', 'Blue', 'Dark Blue', 'Black']
    ),
    (
      dropshoulder_id,
      'Jabal Drop Shoulder',
      'Men''s drop shoulder top with an easy oversized fit.',
      650,
      'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/brown/front.png',
      'drop shoulder',
      array['S', 'M', 'L', 'XL', 'XXL'],
      array['Brown', 'Burgundy', 'Gray'],
      0,
      true,
      'mens',
      array['Brown', 'Burgundy', 'Gray']
    )
  on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    price_egp = excluded.price_egp,
    image_url = excluded.image_url,
    category = excluded.category,
    size = excluded.size,
    color = excluded.color,
    gender = excluded.gender,
    color_order = excluded.color_order;

  delete from public.product_media
  where item_id in (polo_id, dropshoulder_id);

  insert into public.product_media (item_id, color, label, url, kind, sort_order)
  values
    (polo_id, 'Sage', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/front.png', 'gallery', 10),
    (polo_id, 'Sage', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/side.png', 'gallery', 20),
    (polo_id, 'Sage', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/back%20view.png', 'gallery', 30),
    (polo_id, 'Sage', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/close%20up.png', 'gallery', 40),
    (polo_id, 'Gray', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/gray/front.png', 'gallery', 10),
    (polo_id, 'Gray', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/gray/side.png', 'gallery', 20),
    (polo_id, 'Gray', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/gray/back.png', 'gallery', 30),
    (polo_id, 'Gray', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/gray/close%20up.png', 'gallery', 40),
    (polo_id, 'Burgundy', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/burgandy/front.png', 'gallery', 10),
    (polo_id, 'Burgundy', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/burgandy/back.png', 'gallery', 20),
    (polo_id, 'Burgundy', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/burgandy/close%20up.png', 'gallery', 30),
    (polo_id, 'Burgundy', 'Fit', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/burgandy/3%3A4.png', 'gallery', 40),
    (polo_id, 'Blue', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/blue/front.png', 'gallery', 10),
    (polo_id, 'Blue', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/blue/side%20view.png', 'gallery', 20),
    (polo_id, 'Blue', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/blue/back.png', 'gallery', 30),
    (polo_id, 'Blue', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/blue/close%20up.png', 'gallery', 40),
    (polo_id, 'Dark Blue', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/dark%20blue/front.png', 'gallery', 10),
    (polo_id, 'Dark Blue', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/dark%20blue/side.png', 'gallery', 20),
    (polo_id, 'Dark Blue', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/dark%20blue/back.png', 'gallery', 30),
    (polo_id, 'Dark Blue', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/dark%20blue/close%20up.png', 'gallery', 40),
    (polo_id, 'Black', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/black/front.png', 'gallery', 10),
    (polo_id, 'Black', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/black/side.png', 'gallery', 20),
    (polo_id, 'Black', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/black/back.png', 'gallery', 30),
    (polo_id, 'Black', 'Close Up', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/black/close%20up.png', 'gallery', 40),
    (dropshoulder_id, 'Brown', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/brown/front.png', 'gallery', 10),
    (dropshoulder_id, 'Brown', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/brown/side.png', 'gallery', 20),
    (dropshoulder_id, 'Brown', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/brown/back.png', 'gallery', 30),
    (dropshoulder_id, 'Burgundy', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/burgandy/front.png', 'gallery', 10),
    (dropshoulder_id, 'Burgundy', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/burgandy/side.png', 'gallery', 20),
    (dropshoulder_id, 'Burgundy', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/burgandy/back.png', 'gallery', 30),
    (dropshoulder_id, 'Gray', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/gray/front.png', 'gallery', 10),
    (dropshoulder_id, 'Gray', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/gray/side.png', 'gallery', 20);

  insert into public.product_variants (item_id, color, size, stock_quantity, image_url, sku)
  select product_id, color_name, size_name, 10, image_url, sku_prefix || '-' || sku_color || '-' || size_name
  from (
    values
      (polo_id, 'Sage', 'SAGE', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/sage/front.png'),
      (polo_id, 'Gray', 'GRAY', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/gray/front.png'),
      (polo_id, 'Burgundy', 'BURGUNDY', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/burgandy/front.png'),
      (polo_id, 'Blue', 'BLUE', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/blue/front.png'),
      (polo_id, 'Dark Blue', 'DARK-BLUE', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/dark%20blue/front.png'),
      (polo_id, 'Black', 'BLACK', 'JBL-POLO', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/polo/black/front.png'),
      (dropshoulder_id, 'Brown', 'BROWN', 'JBL-DROP-SHOULDER', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/brown/front.png'),
      (dropshoulder_id, 'Burgundy', 'BURGUNDY', 'JBL-DROP-SHOULDER', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/burgandy/front.png'),
      (dropshoulder_id, 'Gray', 'GRAY', 'JBL-DROP-SHOULDER', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/dropshoulder/gray/front.png')
  ) as colors(product_id, color_name, sku_color, sku_prefix, image_url)
  cross join unnest(array['S', 'M', 'L', 'XL', 'XXL']) as sizes(size_name)
  on conflict (item_id, color, size) do update
  set
    image_url = excluded.image_url,
    sku = excluded.sku;
end $$;
