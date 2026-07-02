-- Add read-only admin access for the Phase 1 dashboard.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamp with time zone not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

grant select on table public.revenue to authenticated;

drop policy if exists "Admins can read revenue" on public.revenue;
create policy "Admins can read revenue"
on public.revenue
for select
to authenticated
using (public.is_admin());

grant select on table public.combined_orders to authenticated;

drop policy if exists "Admins can read combined orders" on public.combined_orders;
create policy "Admins can read combined orders"
on public.combined_orders
for select
to authenticated
using (public.is_admin());

notify pgrst, 'reload schema';
