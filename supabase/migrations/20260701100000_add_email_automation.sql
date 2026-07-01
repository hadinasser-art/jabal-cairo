create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text,
  customer_name text,
  order_status text,
  payment_status text,
  checkout_status text,
  total numeric default 0,
  currency text default 'EGP',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  abandoned_email_sent_at timestamptz
);

alter table if exists public.orders
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists order_status text,
  add column if not exists payment_status text,
  add column if not exists checkout_status text,
  add column if not exists total numeric default 0,
  add column if not exists currency text default 'EGP',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists abandoned_email_sent_at timestamptz;

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  email_type text not null,
  recipient_email text not null,
  status text not null check (status in ('sent', 'failed')),
  resend_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_order_id_idx on public.email_logs (order_id);
create index if not exists email_logs_email_type_idx on public.email_logs (email_type);
create index if not exists email_logs_status_idx on public.email_logs (status);
create unique index if not exists email_logs_one_sent_per_order_type_idx
  on public.email_logs (order_id, email_type)
  where status = 'sent';

create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_checkout_status_created_at_idx
  on public.orders (checkout_status, created_at)
  where abandoned_email_sent_at is null;
