-- Harden public write access and move checkout writes behind a scoped RPC.

-- 1) combined_orders: remove wide-open public update and insert policies.
drop policy if exists "Public can update combined_orders" on public.combined_orders;
drop policy if exists "Public can insert combined_orders" on public.combined_orders;

drop policy if exists "Users can update their own combined orders" on public.combined_orders;
create policy "Users can update their own combined orders"
on public.combined_orders
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Guest-order updates must go through a scoped function, not a direct table policy.
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

-- 2) items: remove public update access. Stock sync is handled by RPC/trigger code.
drop policy if exists "Public can update items stock" on public.items;

-- 3) Remove direct RPC access to internal helpers that frontend no longer calls.
revoke all on function public.generate_order_id() from public, anon, authenticated;
revoke all on function public.increment_offer_uses(uuid[]) from public, anon, authenticated;
revoke all on function public.increment_offer_uses(uuid) from public, anon, authenticated;
revoke all on function public.sync_item_from_variants() from public, anon, authenticated;

-- 4) Pin search_path on existing functions.
alter function public.set_product_variants_updated_at() set search_path = public;
alter function public.reduce_stock_on_order() set search_path = public;
alter function public.check_sold_out() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.sync_item_stock_from_variants() set search_path = public;
alter function public.sync_item_from_variants() set search_path = public;
alter function public.place_order(text, text, text, text, text) set search_path = public;

-- 5) Public checkout RPC. This is the only public path that creates an order,
-- decrements stock, and increments offer usage.
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
  v_existing_orders integer;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Invalid order payload';
  end if;

  if coalesce(jsonb_array_length(coalesce(p_order->'items', '[]'::jsonb)), 0) = 0 then
    raise exception 'Order must include at least one item';
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

  select coalesce(array_agg(value::uuid), array[]::uuid[])
    into v_offer_ids
  from jsonb_array_elements_text(coalesce(p_order->'applied_offer_ids', '[]'::jsonb));

  if exists (
    select 1
    from public.offers o
    where o.id = any(v_offer_ids)
      and o.discount_type = 'percentage'
      and o.discount_value = 15
      and (
        o.first_order_only = true
        or lower(coalesce(o.title, '') || ' ' || coalesce(o.description, '')) ~ '(account|sign up|signup)'
      )
  ) then
    if v_user_id is null then
      raise exception 'This offer requires an account';
    end if;

    select count(*)
      into v_existing_orders
    from public.combined_orders
    where user_id = v_user_id;

    if v_existing_orders > 0 then
      raise exception 'This account has already used its first-order offer';
    end if;
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
    coalesce((p_order->>'subtotal_egp')::numeric, 0),
    coalesce((p_order->>'shipping_fee_egp')::numeric, 0),
    coalesce((p_order->>'discount_egp')::numeric, 0),
    coalesce((p_order->>'total_price_egp')::numeric, 0),
    coalesce(nullif(p_order->>'payment_method', ''), 'cod'),
    coalesce(nullif(p_order->>'status', ''), 'pending')::public.status,
    v_user_id,
    nullif(p_order->>'offer_id', '')::uuid,
    coalesce((p_order->>'discount_amount_egp')::numeric, 0)
  );

  for v_item in
    select value
    from jsonb_array_elements(p_order->'items')
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);
    if v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    v_item_id := nullif(v_item->>'item_id', '')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    if v_variant_id is not null then
      update public.product_variants
      set stock_quantity = stock_quantity - v_quantity
      where id = v_variant_id
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

    if to_regclass('public.orders') is not null then
      execute $sql$
        insert into public.orders (
          order_id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          item_id,
          variant_id,
          item_name,
          quantity,
          total_price_egp,
          user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      $sql$
      using
        v_order_id,
        nullif(trim(p_order->>'customer_name'), ''),
        nullif(trim(p_order->>'customer_email'), ''),
        nullif(trim(p_order->>'customer_phone'), ''),
        nullif(trim(p_order->>'shipping_address'), ''),
        v_item_id,
        v_variant_id,
        v_item->>'item_name',
        v_quantity,
        coalesce((v_item->>'total_price_egp')::numeric, 0),
        v_user_id;
    end if;
  end loop;

  if coalesce(array_length(v_offer_ids, 1), 0) > 0 then
    update public.offers
    set uses_count = coalesce(uses_count, 0) + 1
    where id = any(v_offer_ids)
      and active = true
      and (max_uses is null or uses_count < max_uses);
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
