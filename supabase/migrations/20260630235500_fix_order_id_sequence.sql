create sequence if not exists public.order_seq
  as bigint
  increment by 1
  minvalue 1
  start with 1;

do $$
declare
  next_order_id bigint;
begin
  select coalesce(
    max((substring(order_id from 'JBL-([0-9]+)$'))::bigint),
    0
  ) + 1
    into next_order_id
  from public.combined_orders
  where order_id ~ '^JBL-[0-9]+$';

  execute format('alter sequence public.order_seq restart with %s', next_order_id);
end $$;

create or replace function public.generate_order_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_order bigint;
begin
  next_order := nextval('public.order_seq');
  return 'JBL-' || lpad(next_order::text, 4, '0');
end;
$$;

revoke all on sequence public.order_seq from anon, authenticated;
grant execute on function public.generate_order_id() to anon, authenticated;
