-- Product media metadata keeps galleries, color thumbnails, color ordering, and
-- size charts editable from data instead of hardcoding product IDs in the app.

alter table public.items
add column if not exists size_chart_url text,
add column if not exists color_order text[];

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  color text,
  label text not null,
  url text not null,
  kind text not null default 'gallery' check (kind in ('gallery', 'thumbnail')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_media enable row level security;

drop policy if exists "Public can read product media" on public.product_media;
create policy "Public can read product media"
on public.product_media
for select
to anon, authenticated
using (true);

drop trigger if exists trg_product_media_updated_at on public.product_media;
create trigger trg_product_media_updated_at
before update on public.product_media
for each row execute function public.set_product_variants_updated_at();

create index if not exists product_media_item_color_idx
on public.product_media (item_id, color, sort_order);

update public.items
set size_chart_url = 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/short%20measurements.jpg'
where id = 'e13c0513-522d-4133-af02-2c6f0c33e9ce'::uuid
  and size_chart_url is null;

update public.items
set color_order = array['Orange', 'Navy Blue', 'Baby Blue']
where id = 'c5d77496-59d1-4dc5-baf0-1d6f34352ea9'::uuid
  and color_order is null;

update public.items
set size_chart_url = 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/women/wide%20leg/wide%20leg%20women%20chart.jpg'
where lower(coalesce(name, '') || ' ' || coalesce(category, '')) like '%wide leg%'
  and size_chart_url is null;

insert into public.product_media (item_id, color, label, url, kind, sort_order)
values
  ('e13c0513-522d-4133-af02-2c6f0c33e9ce', 'Black', 'Black', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/black.jpg', 'thumbnail', 10),
  ('e13c0513-522d-4133-af02-2c6f0c33e9ce', 'Gray', 'Gray', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/gray.jpg', 'thumbnail', 20),
  ('e13c0513-522d-4133-af02-2c6f0c33e9ce', 'Sage', 'Sage', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/sage.jpg', 'thumbnail', 30),
  ('e13c0513-522d-4133-af02-2c6f0c33e9ce', 'Steel Blue', 'Steel Blue', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/Steel%20Blue.jpg', 'thumbnail', 40),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Orange', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/front.png?v=20260702172413', 'gallery', 10),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Orange', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/side.png?v=20260702172413', 'gallery', 20),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Orange', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/back.png?v=20260702172413', 'gallery', 30),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Orange', 'Fit', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/3%3A4.png?v=20260702172413', 'gallery', 40),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Baby Blue', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/front.png?v=20260702015922', 'gallery', 10),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Baby Blue', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/side.png?v=20260702015922', 'gallery', 20),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Baby Blue', 'Detail', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/image.png?v=20260702015922', 'gallery', 30),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Baby Blue', 'Fit', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/3%3A4.png?v=20260702015922', 'gallery', 40),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Navy Blue', 'Front', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/front.png?v=20260702155114', 'gallery', 10),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Navy Blue', 'Side', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/side.png?v=20260702155114', 'gallery', 20),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Navy Blue', 'Back', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/back.png?v=20260702155114', 'gallery', 30),
  ('c5d77496-59d1-4dc5-baf0-1d6f34352ea9', 'Navy Blue', 'Fit', 'https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/3%3A4.png?v=20260702155114', 'gallery', 40)
on conflict do nothing;
