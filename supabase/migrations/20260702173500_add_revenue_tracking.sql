-- Track paid monthly revenue from combined_orders.

create table if not exists public.revenue (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  total_revenue_egp numeric not null default 0 check (total_revenue_egp >= 0),
  paid_order_count integer not null default 0 check (paid_order_count >= 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.revenue enable row level security;

revoke all on table public.revenue from anon, authenticated;

insert into public.revenue (month_start)
select generate_series(date '2026-07-01', date '2027-07-01', interval '1 month')::date
on conflict (month_start) do nothing;

create or replace function public.apply_revenue_delta(
  p_month_start date,
  p_total_delta numeric,
  p_order_count_delta integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_month_start is null then
    return;
  end if;

  insert into public.revenue (
    month_start,
    total_revenue_egp,
    paid_order_count,
    updated_at
  )
  values (
    p_month_start,
    greatest(0, coalesce(p_total_delta, 0)),
    greatest(0, coalesce(p_order_count_delta, 0)),
    now()
  )
  on conflict (month_start) do update
  set
    total_revenue_egp = greatest(
      0,
      public.revenue.total_revenue_egp + coalesce(p_total_delta, 0)
    ),
    paid_order_count = greatest(
      0,
      public.revenue.paid_order_count + coalesce(p_order_count_delta, 0)
    ),
    updated_at = now();
end;
$$;

create or replace function public.sync_revenue_from_combined_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status::text = 'paid' then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(new.created_at, now()))::date,
        coalesce(new.total_price_egp, 0),
        1
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status::text = 'paid' then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(old.created_at, now()))::date,
        -coalesce(old.total_price_egp, 0),
        -1
      );
    end if;

    if new.status::text = 'paid' then
      perform public.apply_revenue_delta(
        date_trunc('month', coalesce(new.created_at, now()))::date,
        coalesce(new.total_price_egp, 0),
        1
      );
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status::text = 'paid' then
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

drop trigger if exists sync_revenue_from_combined_order_insert on public.combined_orders;
create trigger sync_revenue_from_combined_order_insert
after insert on public.combined_orders
for each row
execute function public.sync_revenue_from_combined_order();

drop trigger if exists sync_revenue_from_combined_order_update on public.combined_orders;
create trigger sync_revenue_from_combined_order_update
after update of status, total_price_egp, created_at on public.combined_orders
for each row
execute function public.sync_revenue_from_combined_order();

drop trigger if exists sync_revenue_from_combined_order_delete on public.combined_orders;
create trigger sync_revenue_from_combined_order_delete
after delete on public.combined_orders
for each row
execute function public.sync_revenue_from_combined_order();

insert into public.revenue (month_start)
select generate_series(date '2026-07-01', date '2027-07-01', interval '1 month')::date
on conflict (month_start) do nothing;

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
where status::text = 'paid'
group by 1
on conflict (month_start) do update
set
  total_revenue_egp = excluded.total_revenue_egp,
  paid_order_count = excluded.paid_order_count,
  updated_at = now();

revoke execute on function public.apply_revenue_delta(date, numeric, integer)
  from anon, authenticated, public;
revoke execute on function public.sync_revenue_from_combined_order()
  from anon, authenticated, public;

notify pgrst, 'reload schema';
