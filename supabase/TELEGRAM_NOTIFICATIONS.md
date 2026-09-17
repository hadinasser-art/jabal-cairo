# Telegram order notifications

New inserts into `public.combined_orders` enqueue an alert containing the order number,
item count, total in EGP, independent payment/fulfillment statuses, and the admin link.
Customer names, addresses, phone numbers, and emails are not copied into alerts.
The existing Make triggers remain separate.

## Architecture

- `enqueue_telegram_new_order` saves one delivery per order in the private
  `jabal_notifications.deliveries` table and schedules an asynchronous worker call.
- `telegram-order-alert` reads `TELEGRAM_BOT_TOKEN` from Supabase Edge Function secrets.
  It authenticates every request using a random callback credential generated inside
  Supabase Vault. The credential is never committed or returned in responses.
- The public RPC is an invoker wrapper, executable only by `service_role`. Its private
  implementation verifies the callback credential before accessing notification state.
  Storefront roles have no access to the private schema, tables, or functions.
- The `jabal-telegram-order-retries` database cron job checks once per minute and only
  invokes the Edge Function when an eligible delivery exists. No Edge calls while idle.
- Claims use row locking and a two-minute lease. Failures retry up to eight attempts
  with exponential backoff, honoring Telegram rate limits. Exhausted deliveries remain
  available for inspection and manual retry.

Delivery is **at least once**, not exactly once: if Telegram accepts a message but the
acknowledgement cannot be saved, a retry can produce a duplicate. No successful delivery
is deliberately resent. Notification HTTP failures do not block checkout; the durable
queue insert is part of the order transaction.

## Initial setup

1. Save `TELEGRAM_BOT_TOKEN` in the project's Edge Function secrets.
2. Apply the migration and deploy `telegram-order-alert` with its `deno.json`.
   `verify_jwt = false` is intentional: the handler implements its own callback-key
   authentication before performing any Telegram action.
3. In the SQL editor as the project administrator, configure the endpoint and a fresh
   pairing code. Send exactly that code to the bot in a **private** Telegram chat.

```sql
update jabal_notifications.config
set function_url = 'https://<project-ref>.supabase.co/functions/v1/telegram-order-alert',
    pairing_code = '<fresh unique pairing code>',
    pairing_expires_at = now() + interval '30 minutes'
where singleton and chat_id is null;

select jabal_notifications.wake('pair');
```

Pairing succeeds only when exactly one private chat has the matching message. It stores
the chat ID, clears the code, and enables delivery. A second pairing cannot overwrite
the recipient. To change recipients, an administrator must disable delivery and clear
the stored chat ID before pairing again.

Check a returned request ID without reading request headers or Vault secrets:

```sql
select status_code, content, timed_out
from net._http_response where id = <request-id>;

select enabled, chat_id is not null as paired
from jabal_notifications.config;
```

## Switch to a group

Add the bot to the group and send an explicit bot command, for example
`/start@your_bot GROUP-<unique-code>`. Set `pairing_code` to that entire command and
`pairing_expires_at` to 30 minutes from now, without clearing the existing `chat_id`.
Call `jabal_notifications.wake('find_group')` and inspect its response as above.
Only one group or supergroup with the exact command is accepted; private chats are ignored.
Discovery does not alter the active recipient.

After checking the returned group ID, the administrator can update `config.chat_id`
to that ID (including its minus sign), clear the pairing code and expiry, and send a
labelled test delivery. Existing private-chat alerts then move to the group.

## Operations

```sql
-- Delivery status; no customer contact information or secrets.
select order_id, attempts, sent_at, last_error, next_attempt_at
from jabal_notifications.deliveries order by created_at desc;

-- Retry a failed delivery after fixing its cause.
update jabal_notifications.deliveries
set attempts = 0, locked_until = null, next_attempt_at = now()
where order_id = '<order-id>' and sent_at is null;
select jabal_notifications.wake();

-- Pause sends without discarding queued alerts.
update jabal_notifications.config set enabled = false where singleton;
```

Enable Telegram notifications for this bot on the recipient's phone.
No paid broadcasting is used. Supabase's project usage limits still apply.

## Verification

```sh
deno check supabase/functions/telegram-order-alert/index.ts
deno test supabase/functions/telegram-order-alert/handler_test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vite/bin/vite.js build
```

Run `supabase/tests/telegram_order_notifications.sql` as postgres to verify enqueueing,
duplicate protection, permissions, retries, and stale leases. It uses a temporary order
table and rolls back all changes, so it does not create customer orders or fire Make
automations. For an end-to-end delivery test, enqueue a clearly labelled `is_test: true`
payload directly in the private delivery queue and check `sent_at` and the bot chat.

The security advisor's informational “RLS enabled, no policy” findings on the two private
notification tables are intentional: direct table access is denied. The deployment audit
also found pre-existing warnings on unrelated public functions and Auth password settings;
this change does not modify those. See the [Supabase security advisor reference](https://supabase.com/docs/guides/database/database-linter).
