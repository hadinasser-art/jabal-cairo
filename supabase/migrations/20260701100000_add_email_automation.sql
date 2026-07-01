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

alter table public.email_logs enable row level security;
