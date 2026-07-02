-- Allow admins to safely manage order status and fulfillment fields.

create or replace function public.admin_update_order(
  p_order_id text,
  p_status public.status,
  p_tracking_number text default null,
  p_payment_reference text default null
)
returns table (
  order_id text,
  customer_name text,
  customer_email text,
  total_items integer,
  total_price_egp numeric,
  status public.status,
  tracking_number text,
  payment_reference text,
  created_at timestamp with time zone,
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

  if nullif(trim(p_order_id), '') is null then
    raise exception 'Order id is required';
  end if;

  return query
  update public.combined_orders co
  set
    status = p_status,
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
    co.status,
    co.tracking_number,
    co.payment_reference,
    co.created_at,
    co.updated_at;

  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

revoke execute on function public.admin_update_order(text, public.status, text, text)
  from public, anon;
grant execute on function public.admin_update_order(text, public.status, text, text)
  to authenticated;

notify pgrst, 'reload schema';
