-- Add verified product reviews with optional customer photos and admin moderation.

create table if not exists public.combined_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  user_id uuid,
  item_id uuid not null references public.items(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  total_price_egp numeric not null default 0,
  selected_size text,
  selected_color text,
  created_at timestamptz not null default now()
);

alter table public.combined_order_items enable row level security;

create index if not exists combined_order_items_order_id_idx
  on public.combined_order_items (order_id);

create index if not exists combined_order_items_user_item_idx
  on public.combined_order_items (user_id, item_id, selected_color);

grant select on table public.combined_order_items to authenticated;

drop policy if exists "Owners and admins can read order items" on public.combined_order_items;
create policy "Owners and admins can read order items"
on public.combined_order_items
for select
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  order_id text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 12 and 1200),
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  selected_color text,
  selected_size text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  verified_buyer boolean not null default true,
  moderation_note text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;

create index if not exists product_reviews_item_status_idx
  on public.product_reviews (item_id, status, selected_color, created_at desc);

create unique index if not exists product_reviews_user_item_color_active_idx
  on public.product_reviews (user_id, item_id, lower(coalesce(selected_color, '')))
  where status in ('pending', 'approved');

grant select on table public.product_reviews to anon, authenticated;

drop policy if exists "Public can read approved product reviews" on public.product_reviews;
create policy "Public can read approved product reviews"
on public.product_reviews
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Owners and admins can read private product reviews" on public.product_reviews;
create policy "Owners and admins can read private product reviews"
on public.product_reviews
for select
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

create table if not exists public.product_review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.product_reviews(id) on delete cascade,
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  content_type text,
  file_size integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_review_photos enable row level security;

create index if not exists product_review_photos_review_status_idx
  on public.product_review_photos (review_id, status, sort_order);

grant select on table public.product_review_photos to anon, authenticated;

drop policy if exists "Public can read approved review photos" on public.product_review_photos;
create policy "Public can read approved review photos"
on public.product_review_photos
for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1
    from public.product_reviews pr
    where pr.id = product_review_photos.review_id
      and pr.status = 'approved'
  )
);

drop policy if exists "Owners and admins can read private review photos" on public.product_review_photos;
create policy "Owners and admins can read private review photos"
on public.product_review_photos
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.product_reviews pr
    where pr.id = product_review_photos.review_id
      and pr.user_id = (select auth.uid())
  )
);

drop trigger if exists trg_product_reviews_updated_at on public.product_reviews;
create trigger trg_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_product_variants_updated_at();

drop trigger if exists trg_product_review_photos_updated_at on public.product_review_photos;
create trigger trg_product_review_photos_updated_at
before update on public.product_review_photos
for each row execute function public.set_product_variants_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Review photo owners can upload" on storage.objects;
create policy "Review photo owners can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'review-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Review photo owners can read their uploads" on storage.objects;
create policy "Review photo owners can read their uploads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'review-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin()
  )
);

drop policy if exists "Public can read approved review photo objects" on storage.objects;
create policy "Public can read approved review photo objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'review-photos'
  and exists (
    select 1
    from public.product_review_photos prp
    join public.product_reviews pr on pr.id = prp.review_id
    where prp.storage_path = storage.objects.name
      and prp.status = 'approved'
      and pr.status = 'approved'
  )
);

create or replace function public.submit_product_review(
  p_item_id uuid,
  p_variant_id uuid,
  p_order_id text,
  p_rating integer,
  p_review_text text,
  p_display_name text,
  p_photo_paths text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_review_id uuid;
  v_selected_color text;
  v_selected_size text;
  v_photo_path text;
  v_photo_count integer := coalesce(array_length(p_photo_paths, 1), 0);
  v_index integer := 0;
begin
  if v_user_id is null then
    raise exception 'Sign in to leave a review';
  end if;

  if p_item_id is null or p_order_id is null or trim(p_order_id) = '' then
    raise exception 'Missing review details';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if char_length(trim(coalesce(p_review_text, ''))) < 12 then
    raise exception 'Review must be at least 12 characters';
  end if;

  if char_length(trim(coalesce(p_review_text, ''))) > 1200 then
    raise exception 'Review must be 1200 characters or fewer';
  end if;

  if char_length(trim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Display name is required';
  end if;

  if char_length(trim(coalesce(p_display_name, ''))) > 80 then
    raise exception 'Display name is too long';
  end if;

  if lower(p_review_text) ~ '(https?://|www\\.|bit\\.ly|promo code|discount code|whatsapp|telegram)' then
    raise exception 'Review cannot include links or promotions';
  end if;

  if v_photo_count > 4 then
    raise exception 'Upload up to 4 photos';
  end if;

  if p_variant_id is not null and not exists (
    select 1
    from public.product_variants pv
    where pv.id = p_variant_id
      and pv.item_id = p_item_id
  ) then
    raise exception 'Variant does not match product';
  end if;

  select coi.selected_color, coi.selected_size
    into v_selected_color, v_selected_size
  from public.combined_order_items coi
  join public.combined_orders co on co.order_id = coi.order_id
  where coi.order_id = p_order_id
    and coi.user_id = v_user_id
    and coi.item_id = p_item_id
    and (p_variant_id is null or coi.variant_id = p_variant_id)
    and co.user_id = v_user_id
    and co.status in ('shipped', 'delivered')
  order by coi.created_at desc
  limit 1;

  if v_selected_color is null and not exists (
    select 1
    from public.combined_order_items coi
    join public.combined_orders co on co.order_id = coi.order_id
    where coi.order_id = p_order_id
      and coi.user_id = v_user_id
      and coi.item_id = p_item_id
      and (p_variant_id is null or coi.variant_id = p_variant_id)
      and co.user_id = v_user_id
      and co.status in ('shipped', 'delivered')
  ) then
    raise exception 'Only verified buyers can review this product';
  end if;

  if exists (
    select 1
    from public.product_reviews pr
    where pr.user_id = v_user_id
      and pr.item_id = p_item_id
      and lower(coalesce(pr.selected_color, '')) = lower(coalesce(v_selected_color, ''))
      and pr.status in ('pending', 'approved')
  ) then
    raise exception 'You have already reviewed this product color';
  end if;

  foreach v_photo_path in array coalesce(p_photo_paths, array[]::text[])
  loop
    if v_photo_path is null
      or v_photo_path !~ ('^' || v_user_id::text || '/')
      or v_photo_path ~ '\\.\\.'
    then
      raise exception 'Invalid photo upload path';
    end if;

    if not exists (
      select 1
      from storage.objects so
      where so.bucket_id = 'review-photos'
        and so.name = v_photo_path
        and so.owner = v_user_id
        and so.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
        and coalesce((so.metadata->>'size')::integer, 0) <= 5242880
    ) then
      raise exception 'Uploaded photo is invalid';
    end if;
  end loop;

  insert into public.product_reviews (
    user_id,
    item_id,
    variant_id,
    order_id,
    rating,
    review_text,
    display_name,
    selected_color,
    selected_size
  )
  values (
    v_user_id,
    p_item_id,
    p_variant_id,
    p_order_id,
    p_rating,
    trim(p_review_text),
    trim(p_display_name),
    v_selected_color,
    v_selected_size
  )
  returning id into v_review_id;

  foreach v_photo_path in array coalesce(p_photo_paths, array[]::text[])
  loop
    v_index := v_index + 1;
    insert into public.product_review_photos (
      review_id,
      storage_path,
      status,
      content_type,
      file_size,
      sort_order
    )
    select
      v_review_id,
      v_photo_path,
      'pending',
      so.metadata->>'mimetype',
      coalesce((so.metadata->>'size')::integer, 0),
      v_index
    from storage.objects so
    where so.bucket_id = 'review-photos'
      and so.name = v_photo_path;
  end loop;

  return v_review_id;
end;
$$;

revoke execute on function public.submit_product_review(uuid, uuid, text, integer, text, text, text[])
  from public, anon;
grant execute on function public.submit_product_review(uuid, uuid, text, integer, text, text[])
  to authenticated;

create or replace function public.admin_moderate_product_review(
  p_review_id uuid,
  p_status text,
  p_moderation_note text default null,
  p_rejected_photo_ids uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('approved', 'rejected', 'hidden') then
    raise exception 'Invalid review status';
  end if;

  update public.product_reviews
  set
    status = p_status,
    moderation_note = nullif(trim(coalesce(p_moderation_note, '')), ''),
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    approved_by = case when p_status = 'approved' then (select auth.uid()) else approved_by end
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;

  if p_status = 'approved' then
    update public.product_review_photos
    set status = case
      when id = any(coalesce(p_rejected_photo_ids, array[]::uuid[])) then 'rejected'
      else 'approved'
    end
    where review_id = p_review_id
      and status in ('pending', 'approved', 'rejected');
  elsif p_status = 'rejected' then
    update public.product_review_photos
    set status = 'rejected'
    where review_id = p_review_id;
  elsif p_status = 'hidden' then
    update public.product_review_photos
    set status = 'hidden'
    where review_id = p_review_id;
  end if;
end;
$$;

revoke execute on function public.admin_moderate_product_review(uuid, text, text, uuid[])
  from public, anon;
grant execute on function public.admin_moderate_product_review(uuid, text, text, uuid[])
  to authenticated;

create or replace function public.get_review_eligible_purchases(p_item_id uuid)
returns table (
  order_id text,
  item_id uuid,
  variant_id uuid,
  selected_color text,
  selected_size text,
  purchased_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coi.order_id,
    coi.item_id,
    coi.variant_id,
    coi.selected_color,
    coi.selected_size,
    co.created_at as purchased_at
  from public.combined_order_items coi
  join public.combined_orders co on co.order_id = coi.order_id
  where coi.user_id = (select auth.uid())
    and co.user_id = (select auth.uid())
    and coi.item_id = p_item_id
    and co.status in ('shipped', 'delivered')
    and not exists (
      select 1
      from public.product_reviews pr
      where pr.user_id = (select auth.uid())
        and pr.item_id = coi.item_id
        and lower(coalesce(pr.selected_color, '')) = lower(coalesce(coi.selected_color, ''))
        and pr.status in ('pending', 'approved')
    )
  order by co.created_at desc;
$$;

revoke execute on function public.get_review_eligible_purchases(uuid)
  from public, anon;
grant execute on function public.get_review_eligible_purchases(uuid)
  to authenticated;

create or replace function public.place_order(p_order jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_user_id uuid;
  v_user_id_text text;
  v_offer_ids uuid[];
  v_item jsonb;
  v_item_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_price numeric;
  v_server_subtotal numeric := 0;
  v_shipping_fee numeric := 0;
  v_discount_total numeric := 0;
  v_running_subtotal numeric := 0;
  v_total numeric := 0;
  v_existing_orders integer := 0;
  v_entered_code text := lower(trim(coalesce(p_order->>'promo_code', '')));
  v_highest_offer_id uuid := null;
  v_offer record;
  v_saved numeric;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Invalid order payload';
  end if;

  if coalesce(jsonb_array_length(coalesce(p_order->'items', '[]'::jsonb)), 0) = 0 then
    raise exception 'Order must include at least one item';
  end if;

  if nullif(trim(coalesce(p_order->>'customer_name', '')), '') is null
    or nullif(trim(coalesce(p_order->>'customer_email', '')), '') is null
    or nullif(trim(coalesce(p_order->>'customer_phone', '')), '') is null
    or nullif(trim(coalesce(p_order->>'shipping_address', '')), '') is null
  then
    raise exception 'Missing required customer details';
  end if;

  if nullif(trim(coalesce(p_order->>'customer_email', '')), '') !~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' then
    raise exception 'Invalid customer email';
  end if;

  if nullif(trim(coalesce(p_order->>'customer_phone', '')), '') !~ '^[0-9+\\-\\s()]{7,20}$' then
    raise exception 'Invalid customer phone';
  end if;

  v_user_id_text := nullif(p_order->>'user_id', '');
  if v_user_id_text is not null then
    v_user_id := v_user_id_text::uuid;
    if (select auth.uid()) is null or (select auth.uid()) <> v_user_id then
      raise exception 'User does not match authenticated session';
    end if;
  elsif (select auth.uid()) is not null then
    raise exception 'Authenticated checkout must include the authenticated user_id';
  end if;

  if v_user_id is not null then
    select count(*)
      into v_existing_orders
    from public.combined_orders
    where user_id = v_user_id;
  end if;

  select coalesce(array_agg(value::uuid), array[]::uuid[])
    into v_offer_ids
  from jsonb_array_elements_text(coalesce(p_order->'applied_offer_ids', '[]'::jsonb));

  for v_item in
    select value
    from jsonb_array_elements(p_order->'items')
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);
    if v_quantity <= 0 or v_quantity > 50 then
      raise exception 'Invalid item quantity';
    end if;

    v_item_id := nullif(v_item->>'item_id', '')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    if v_variant_id is not null then
      select i.price_egp
        into v_price
      from public.product_variants pv
      join public.items i on i.id = pv.item_id
      where pv.id = v_variant_id
        and pv.item_id = v_item_id
        and pv.stock_quantity >= v_quantity
        and i.sold_out = false;
    else
      select i.price_egp
        into v_price
      from public.items i
      where i.id = v_item_id
        and i.stock_quantity >= v_quantity
        and i.sold_out = false;
    end if;

    if v_price is null then
      raise exception 'Item is unavailable or out of stock';
    end if;

    v_server_subtotal := v_server_subtotal + (v_price * v_quantity);
  end loop;

  v_running_subtotal := round(v_server_subtotal);

  for v_offer in
    select *
    from public.offers o
    where o.id = any(v_offer_ids)
      and o.active = true
      and (o.start_date is null or o.start_date <= now())
      and (o.end_date is null or o.end_date > now())
      and (o.max_uses is null or o.uses_count < o.max_uses)
      and (
        o.duration_hours is null
        or (
          coalesce(o.start_date, case when o.offer_type = 'timed_sale' then o.created_at else null end)
          is not null
          and coalesce(o.start_date, case when o.offer_type = 'timed_sale' then o.created_at else null end)
            + (o.duration_hours || ' hours')::interval > now()
        )
      )
      and (o.code is null or lower(trim(o.code)) = v_entered_code)
    order by o.priority desc
  loop
    if v_offer.first_order_only and v_user_id is not null and v_existing_orders > 0 then
      continue;
    end if;

    if v_offer.discount_type = 'percentage'
      and v_offer.discount_value = 15
      and (
        v_offer.first_order_only = true
        or lower(coalesce(v_offer.title, '') || ' ' || coalesce(v_offer.description, '')) ~ '(account|sign up|signup)'
      )
    then
      if v_user_id is null then
        raise exception 'This offer requires an account';
      end if;
      if v_existing_orders > 0 then
        raise exception 'This account has already used its first-order offer';
      end if;
    end if;

    if v_offer.minimum_order_egp is not null and v_running_subtotal < v_offer.minimum_order_egp then
      continue;
    end if;

    v_saved := 0;
    if v_offer.discount_type = 'percentage' then
      v_saved := round(v_running_subtotal * coalesce(v_offer.discount_value, 0) / 100);
      v_running_subtotal := greatest(0, round(v_running_subtotal - v_saved));
    elsif v_offer.discount_type = 'fixed' then
      v_saved := least(v_running_subtotal, round(coalesce(v_offer.discount_value, 0)));
      v_running_subtotal := greatest(0, round(v_running_subtotal - v_saved));
    elsif v_offer.discount_type = 'free_shipping' then
      v_saved := v_shipping_fee;
      v_shipping_fee := 0;
    else
      continue;
    end if;

    if v_saved > 0 or v_offer.discount_type = 'free_shipping' then
      v_discount_total := v_discount_total + v_saved;
      if v_highest_offer_id is null then
        v_highest_offer_id := v_offer.id;
      end if;
    end if;
  end loop;

  v_total := greatest(0, round(v_running_subtotal + v_shipping_fee));

  if abs(v_total - coalesce((p_order->>'total_price_egp')::numeric, v_total)) > 1 then
    raise exception 'Order total changed. Please refresh your cart and try again.';
  end if;

  v_order_id := 'JBL-' || lpad(nextval('public.order_seq')::text, 4, '0');

  insert into public.combined_orders (
    order_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    order_summary,
    total_items,
    subtotal_egp,
    shipping_fee_egp,
    discount_egp,
    total_price_egp,
    payment_method,
    status,
    user_id,
    offer_id,
    discount_amount_egp
  )
  values (
    v_order_id,
    nullif(trim(p_order->>'customer_name'), ''),
    nullif(trim(p_order->>'customer_email'), ''),
    nullif(trim(p_order->>'customer_phone'), ''),
    nullif(trim(p_order->>'shipping_address'), ''),
    nullif(p_order->>'order_summary', ''),
    coalesce((p_order->>'total_items')::integer, 0),
    v_server_subtotal,
    v_shipping_fee,
    v_discount_total,
    v_total,
    coalesce(nullif(p_order->>'payment_method', ''), 'cod'),
    coalesce(nullif(p_order->>'status', ''), 'pending')::public.status,
    v_user_id,
    v_highest_offer_id,
    v_discount_total
  );

  for v_item in
    select value
    from jsonb_array_elements(p_order->'items')
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_item_id := nullif(v_item->>'item_id', '')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    if v_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - v_quantity
      where id = v_variant_id
        and item_id = v_item_id
        and stock_quantity >= v_quantity;

      if not found then
        raise exception 'Insufficient stock for selected variant';
      end if;
    else
      update public.items
      set
        stock_quantity = stock_quantity - v_quantity,
        sold_out = (stock_quantity - v_quantity) <= 0
      where id = v_item_id
        and stock_quantity >= v_quantity;

      if not found then
        raise exception 'Insufficient stock for selected item';
      end if;
    end if;

    insert into public.combined_order_items (
      order_id,
      user_id,
      item_id,
      variant_id,
      item_name,
      quantity,
      total_price_egp,
      selected_size,
      selected_color
    )
    values (
      v_order_id,
      v_user_id,
      v_item_id,
      v_variant_id,
      coalesce(nullif(trim(v_item->>'item_name'), ''), 'Product'),
      v_quantity,
      coalesce((v_item->>'total_price_egp')::numeric, 0),
      nullif(trim(coalesce(v_item->>'selected_size', '')), ''),
      nullif(trim(coalesce(v_item->>'selected_color', '')), '')
    );
  end loop;

  if coalesce(array_length(v_offer_ids, 1), 0) > 0 then
    update public.offers
    set uses_count = coalesce(uses_count, 0) + 1
    where id in (
      select id
      from public.offers o
      where o.id = any(v_offer_ids)
        and o.active = true
        and (o.max_uses is null or o.uses_count < o.max_uses)
    );
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
