-- Run as postgres. All test data and configuration changes are rolled back.
begin;
update jabal_notifications.config set enabled = false, function_url = null;
create temporary table telegram_test_orders (
  order_id text, total_items integer, total_price_egp numeric,
  payment_status text, order_status text
);
create trigger telegram_test_enqueue after insert on telegram_test_orders
for each row execute function jabal_notifications.enqueue_order();
insert into telegram_test_orders values ('TEST-QUEUE-ROLLBACK', 2, 1800, 'pending', 'new');
insert into telegram_test_orders values ('TEST-QUEUE-ROLLBACK', 2, 1800, 'pending', 'new');

do $$
declare
  v_secret text;
  v_job jsonb;
  v_second jsonb;
begin
  assert (select count(*) = 1 from jabal_notifications.deliveries where order_id = 'TEST-QUEUE-ROLLBACK'),
    'Repeated inserts must not create duplicate deliveries';
  assert not has_function_privilege('anon', 'public.telegram_order_notification_state(text,text,jsonb)', 'execute'),
    'Anonymous callers must not access the worker';
  assert not has_function_privilege('authenticated', 'public.telegram_order_notification_state(text,text,jsonb)', 'execute'),
    'Storefront users must not access the worker';
  assert not has_table_privilege('authenticated', 'jabal_notifications.config', 'select'),
    'Storefront users must not read notification configuration';
  assert has_function_privilege('service_role', 'public.telegram_order_notification_state(text,text,jsonb)', 'execute'),
    'The Edge Function must be able to call the worker';
  assert public.telegram_order_notification_state('wrong', 'authorize') is null,
    'Incorrect callback keys must be rejected';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jabal_telegram_callback_key';
  update jabal_notifications.config set enabled = true, chat_id = '123';
  -- Isolate the test job without changing or delivering real orders.
  update jabal_notifications.deliveries set next_attempt_at = now() + interval '1 day'
    where order_id <> 'TEST-QUEUE-ROLLBACK';
  v_job := public.telegram_order_notification_state(v_secret, 'claim');
  assert v_job->>'order_id' = 'TEST-QUEUE-ROLLBACK', 'The inserted order must be claimable';
  assert public.telegram_order_notification_state(v_secret, 'claim') is null,
    'Concurrent workers must not claim a leased job';
  perform public.telegram_order_notification_state(v_secret, 'retry', jsonb_build_object(
    'order_id', v_job->>'order_id', 'lease', v_job->>'lease', 'error', 'test', 'retry_after', 120));
  assert (select next_attempt_at >= now() + interval '120 seconds' from jabal_notifications.deliveries
    where order_id = 'TEST-QUEUE-ROLLBACK'), 'Retries must honor the Telegram retry delay';
  update jabal_notifications.deliveries set next_attempt_at = now() where order_id = 'TEST-QUEUE-ROLLBACK';
  v_second := public.telegram_order_notification_state(v_secret, 'claim');
  assert v_second->>'lease' <> v_job->>'lease', 'Each attempt must have a fresh lease';
  perform public.telegram_order_notification_state(v_secret, 'finish', jsonb_build_object(
    'order_id', v_job->>'order_id', 'lease', v_job->>'lease', 'message_id', 1));
  assert (select sent_at is null from jabal_notifications.deliveries where order_id = 'TEST-QUEUE-ROLLBACK'),
    'Stale workers must not acknowledge another attempt';
  perform public.telegram_order_notification_state(v_secret, 'finish', jsonb_build_object(
    'order_id', v_second->>'order_id', 'lease', v_second->>'lease', 'message_id', 2));
  assert public.telegram_order_notification_state(v_secret, 'claim') is null,
    'Successfully delivered orders must not be sent again';
end;
$$;
rollback;
