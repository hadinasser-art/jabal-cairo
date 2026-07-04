-- Split payment state from fulfillment state for combined_orders.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'cod_pending', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'order_status') then
    create type public.order_status as enum ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
  end if;
end;
$$;

alter table public.combined_orders
  add column if not exists payment_status public.payment_status,
  add column if not exists order_status public.order_status;

update public.combined_orders
set
  payment_status = coalesce(
    payment_status,
    case
      when status::text = 'paid' then 'paid'::public.payment_status
      when payment_method = 'instapay'
        and status::text in ('confirmed', 'shipped', 'delivered')
      then 'paid'::public.payment_status
      when status::text = 'cancelled' then 'failed'::public.payment_status
      when payment_method = 'cod' then 'cod_pending'::public.payment_status
      else 'pending'::public.payment_status
    end
  ),
  order_status = coalesce(
    order_status,
    case
      when status::text = 'shipped' then 'shipped'::public.order_status
      when status::text = 'delivered' then 'delivered'::public.order_status
      when status::text = 'cancelled' then 'cancelled'::public.order_status
      when status::text in ('confirmed', 'paid') then 'confirmed'::public.order_status
      else 'new'::public.order_status
    end
  );

alter table public.combined_orders
  alter column payment_status set default 'pending'::public.payment_status,
  alter column payment_status set not null,
  alter column order_status set default 'new'::public.order_status,
  alter column order_status set not null;

create or replace function public.prevent_unpaid_fulfillment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_status = 'pending'::public.payment_status
    and new.order_status in (
      'confirmed'::public.order_status,
      'processing'::public.order_status,
      'shipped'::public.order_status,
      'delivered'::public.order_status
    )
  then
    raise exception 'InstaPay orders must be marked paid before fulfillment';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unpaid_fulfillment on public.combined_orders;
create trigger prevent_unpaid_fulfillment
before insert or update of payment_status, order_status on public.combined_orders
for each row
execute function public.prevent_unpaid_fulfillment();

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
  v_payment_method text := coalesce(nullif(p_order->>'payment_method', ''), 'cod');
  v_payment_status public.payment_status;
  v_order_status public.order_status;
  v_highest_offer_id uuid := null;
  v_offer record;
  v_saved numeric;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Invalid order payload';
  end if;

  if v_payment_method not in ('cod', 'instapay') then
    raise exception 'Invalid payment method';
  end if;

  if v_payment_method = 'instapay' then
    v_payment_status := 'pending'::public.payment_status;
    v_order_status := 'new'::public.order_status;
  else
    v_payment_status := 'cod_pending'::public.payment_status;
    v_order_status := 'confirmed'::public.order_status;
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

  if nullif(trim(coalesce(p_order->>'customer_email', '')), '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid customer email';
  end if;

  if nullif(trim(coalesce(p_order->>'customer_phone', '')), '') !~ '^[0-9+()[:space:]-]{7,20}$' then
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
    payment_status,
    order_status,
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
    v_payment_method,
    v_payment_status,
    v_order_status,
    v_order_status::text::public.status,
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

    if to_regclass('public.combined_order_items') is not null then
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
    end if;
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

drop function if exists public.admin_update_order(text, public.status, text, text);

create or replace function public.admin_update_order(
  p_order_id text,
  p_payment_status public.payment_status,
  p_order_status public.order_status,
  p_tracking_number text default null,
  p_payment_reference text default null
)
returns table (
  order_id text,
  customer_name text,
  customer_email text,
  total_items integer,
  total_price_egp numeric,
  payment_status public.payment_status,
  order_status public.order_status,
  tracking_number text,
  payment_reference text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_status public.order_status := p_order_status;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_order_id), '') is null then
    raise exception 'Order id is required';
  end if;

  if p_payment_status = 'paid'::public.payment_status and p_order_status = 'new'::public.order_status then
    v_order_status := 'confirmed'::public.order_status;
  end if;

  return query
  update public.combined_orders co
  set
    payment_status = p_payment_status,
    order_status = v_order_status,
    status = v_order_status::text::public.status,
    tracking_number = nullif(trim(coalesce(p_tracking_number, '')), ''),
    payment_reference = nullif(trim(coalesce(p_payment_reference, '')), ''),
    updated_at = now()
  where co.order_id = p_order_id
  returning
    co.order_id,
    co.customer_name,
    co.customer_email,
    co.total_items,
    co.total_price_egp,
    co.payment_status,
    co.order_status,
    co.tracking_number,
    co.payment_reference,
    co.created_at,
    co.updated_at;

  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

revoke execute on function public.admin_update_order(
  text,
  public.payment_status,
  public.order_status,
  text,
  text
) from public, anon;
grant execute on function public.admin_update_order(
  text,
  public.payment_status,
  public.order_status,
  text,
  text
) to authenticated;

create or replace function public.sync_revenue_from_combined_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.payment_status = 'paid'::public.payment_status then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(new.created_at, now()))::date,
        coalesce(new.total_price_egp, 0),
        1
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.payment_status = 'paid'::public.payment_status then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(old.created_at, now()))::date,
        -coalesce(old.total_price_egp, 0),
        -1
      );
    end if;

    if new.payment_status = 'paid'::public.payment_status then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(new.created_at, now()))::date,
        coalesce(new.total_price_egp, 0),
        1
      );
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.payment_status = 'paid'::public.payment_status then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(old.created_at, now()))::date,
        -coalesce(old.total_price_egp, 0),
        -1
      );
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_revenue_from_combined_order_update on public.combined_orders;
create trigger sync_revenue_from_combined_order_update
after update of payment_status, total_price_egp, created_at on public.combined_orders
for each row
execute function public.sync_revenue_from_combined_order();

update public.revenue
set
  total_revenue_egp = 0,
  paid_order_count = 0,
  updated_at = now();

insert into public.revenue (
  month_start,
  total_revenue_egp,
  paid_order_count,
  updated_at
)
select
  date_trunc('month', created_at)::date as month_start,
  coalesce(sum(total_price_egp), 0) as total_revenue_egp,
  count(*)::integer as paid_order_count,
  now() as updated_at
from public.combined_orders
where payment_status = 'paid'::public.payment_status
group by 1
on conflict (month_start) do update
set
  total_revenue_egp = excluded.total_revenue_egp,
  paid_order_count = excluded.paid_order_count,
  updated_at = now();

revoke execute on function public.prevent_unpaid_fulfillment()
  from anon, authenticated, public;
revoke execute on function public.sync_revenue_from_combined_order()
  from anon, authenticated, public;

notify pgrst, 'reload schema';
