-- Public bestseller signal for the featured products section.
-- Returns aggregate product/color counts only; private order details remain RLS-protected.

create or replace function public.get_item_purchase_counts()
returns table (
  item_id uuid,
  selected_color text,
  purchase_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('public.combined_order_items') is not null then
    return query execute $sql$
      select
        coi.item_id,
        nullif(trim(coalesce(coi.selected_color, '')), '') as selected_color,
        sum(coi.quantity)::bigint as purchase_count
      from public.combined_order_items coi
      join public.combined_orders co on co.order_id = coi.order_id
      where co.payment_status in ('paid'::public.payment_status, 'cod_pending'::public.payment_status)
        and co.order_status <> 'cancelled'::public.order_status
      group by coi.item_id, nullif(trim(coalesce(coi.selected_color, '')), '')
      having sum(coi.quantity) > 0
    $sql$;
  end if;

  if to_regclass('public.orders') is not null then
    return query execute $sql$
      select
        coalesce(
          case
            when o.item_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then o.item_id::text::uuid
            else null
          end,
          pv.item_id
        ) as item_id,
        nullif(trim(coalesce(pv.color, '')), '') as selected_color,
        sum(o.quantity)::bigint as purchase_count
      from public.orders o
      join public.combined_orders co on co.order_id = o.order_id
      left join public.product_variants pv on pv.id = o.variant_id
      where co.payment_status in ('paid'::public.payment_status, 'cod_pending'::public.payment_status)
        and co.order_status <> 'cancelled'::public.order_status
        and coalesce(
          case
            when o.item_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then o.item_id::text::uuid
            else null
          end,
          pv.item_id
        ) is not null
      group by 1, 2
      having sum(o.quantity) > 0
    $sql$;
  end if;
end;
$$;

revoke all on function public.get_item_purchase_counts() from public;
grant execute on function public.get_item_purchase_counts() to anon, authenticated;
