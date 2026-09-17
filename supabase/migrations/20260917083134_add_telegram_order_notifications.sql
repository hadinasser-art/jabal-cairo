create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema jabal_notifications;
revoke all on schema jabal_notifications from public, anon, authenticated;
grant usage on schema jabal_notifications to service_role;

create table jabal_notifications.config (
  singleton boolean primary key default true check (singleton),
  function_url text,
  chat_id text,
  pairing_code text,
  pairing_expires_at timestamptz,
  enabled boolean not null default false
);
insert into jabal_notifications.config (singleton) values (true);

create table jabal_notifications.deliveries (
  order_id text primary key,
  payload jsonb not null,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease uuid,
  locked_until timestamptz,
  sent_at timestamptz,
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz not null default now()
);
create index telegram_deliveries_pending_idx
  on jabal_notifications.deliveries (next_attempt_at)
  where sent_at is null and attempts < 8;
alter table jabal_notifications.config enable row level security;
alter table jabal_notifications.deliveries enable row level security;
revoke all on all tables in schema jabal_notifications from public, anon, authenticated, service_role;

-- Generate the callback credential inside the database; never expose it in source or logs.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'jabal_telegram_callback_key') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'jabal_telegram_callback_key',
      'Private authentication for the Telegram order notification worker'
    );
  end if;
end;
$$;

create function jabal_notifications.wake(p_action text default 'drain')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select function_url into v_url from jabal_notifications.config where singleton;
  if v_url is null then return null; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets
    where name = 'jabal_telegram_callback_key';
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-jabal-notification-key', v_secret),
    body := jsonb_build_object('action', p_action),
    timeout_milliseconds := 120000
  );
end;
$$;

create function jabal_notifications.enqueue_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into jabal_notifications.deliveries (order_id, payload)
  values (new.order_id, jsonb_build_object(
    'order_id', new.order_id,
    'total_items', coalesce(new.total_items, 0),
    'total_price_egp', new.total_price_egp,
    'payment_status', new.payment_status,
    'order_status', new.order_status
  )) on conflict (order_id) do nothing;

  -- Network scheduling failures must not reject a customer's order; cron retries the queue.
  begin
    if exists (select 1 from jabal_notifications.config where enabled and chat_id is not null) then
      perform jabal_notifications.wake();
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger enqueue_telegram_new_order
after insert on public.combined_orders
for each row execute function jabal_notifications.enqueue_order();

create function jabal_notifications.state(p_secret text, p_action text, p_data jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config jabal_notifications.config%rowtype;
  v_job jabal_notifications.deliveries%rowtype;
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'jabal_telegram_callback_key' and decrypted_secret = p_secret
  ) then return null; end if;
  select * into strict v_config from jabal_notifications.config where singleton;

  if p_action = 'authorize' then
    return jsonb_build_object('chat_id', v_config.chat_id, 'pairing_code',
      case when v_config.pairing_expires_at > now() then v_config.pairing_code else null end);
  elsif p_action = 'pair' then
    if v_config.chat_id is not null or v_config.pairing_expires_at <= now()
      or v_config.pairing_code is null
      or p_data->>'pairing_code' is distinct from v_config.pairing_code
      or coalesce(p_data->>'chat_id', '') !~ '^[0-9]{1,20}$' then
      raise exception 'Pairing unavailable';
    end if;
    update jabal_notifications.config set chat_id = p_data->>'chat_id',
      pairing_code = null, pairing_expires_at = null, enabled = true
    where singleton and chat_id is null;
    return jsonb_build_object('paired', true);
  elsif p_action = 'claim' then
    if not v_config.enabled or v_config.chat_id is null then return null; end if;
    update jabal_notifications.deliveries d
      set attempts = attempts + 1, lease = gen_random_uuid(), locked_until = now() + interval '2 minutes'
      where d.order_id = (
        select q.order_id from jabal_notifications.deliveries q
        where q.sent_at is null and q.attempts < 8 and q.next_attempt_at <= now()
          and (q.locked_until is null or q.locked_until < now())
        order by q.next_attempt_at
        limit 1 for update skip locked
      ) returning d.* into v_job;
    if not found then return null; end if;
    return jsonb_build_object('order_id', v_job.order_id, 'lease', v_job.lease, 'payload', v_job.payload);
  elsif p_action = 'finish' then
    update jabal_notifications.deliveries set sent_at = now(),
      telegram_message_id = (p_data->>'message_id')::bigint,
      locked_until = null, last_error = null
    where order_id = p_data->>'order_id' and lease = (p_data->>'lease')::uuid and sent_at is null;
    return jsonb_build_object('updated', found);
  elsif p_action = 'retry' then
    update jabal_notifications.deliveries set locked_until = null,
      last_error = left(p_data->>'error', 80),
      next_attempt_at = now() + make_interval(secs => greatest(
        least(coalesce((p_data->>'retry_after')::integer, 60), 86400),
        least(3600, 60 * power(2, attempts - 1)::integer)
      ))
    where order_id = p_data->>'order_id' and lease = (p_data->>'lease')::uuid and sent_at is null;
    return jsonb_build_object('updated', found);
  end if;
  raise exception 'Unknown notification action';
end;
$$;

-- Only the Edge Function's service role can reach the private worker functions.
revoke all on all functions in schema jabal_notifications from public, anon, authenticated, service_role;
grant execute on function jabal_notifications.state(text, text, jsonb) to service_role;
create function public.telegram_order_notification_state(p_secret text, p_action text, p_data jsonb default '{}')
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select jabal_notifications.state(p_secret, p_action, p_data); $$;
revoke all on function public.telegram_order_notification_state(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.telegram_order_notification_state(text, text, jsonb) to service_role;

-- No Edge Function calls while idle. A minute-level sweep recovers failed or interrupted sends.
select cron.schedule('jabal-telegram-order-retries', '* * * * *', $cron$
  select jabal_notifications.wake()
  where exists (select 1 from jabal_notifications.config where enabled and chat_id is not null)
    and exists (
      select 1 from jabal_notifications.deliveries
      where sent_at is null and attempts < 8 and next_attempt_at <= now()
        and (locked_until is null or locked_until < now())
    );
$cron$);

notify pgrst, 'reload schema';
