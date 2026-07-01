# JABAL

## Transactional Email Automation

This project sends order emails from server-side code using Supabase and Resend.
Do not put email secrets in client-side code.

### Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```bash
RESEND_API_KEY=...
EMAIL_FROM="JABAL <orders@your-domain.com>"
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

Use `.env.example` as the placeholder reference. Never commit real keys.

### Database Setup

Review and apply this migration in Supabase:

```text
supabase/migrations/20260701100000_add_email_automation.sql
```

It creates `email_logs`, adds missing email automation fields to `orders`, and
adds indexes for order/email processing.

### Email Types

The processor supports:

- `order_received`
- `order_confirmed`
- `payment_received`
- `out_for_delivery`
- `delivered`
- `abandoned_checkout`

Duplicate protection is handled by `email_logs`: if the same `order_id` and
`email_type` already has `status = 'sent'`, it is skipped.

### Vercel Cron

Configure Vercel Cron to call:

```text
/api/cron/process-emails
```

Recommended schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

The endpoint requires:

```text
Authorization: Bearer $CRON_SECRET
```

It returns JSON:

```json
{
  "sent": 0,
  "skipped": 0,
  "failed": 0,
  "results": []
}
```

### Test Email

The test script sends one fake sample email through Resend and does not touch
real Supabase orders.

```bash
bun scripts/test-email.ts your-email@example.com
```

The active TanStack Start cron route is:

```text
src/routes/api/cron/process-emails.ts
```

The requested Next-style compatibility file is also present:

```text
app/api/cron/process-emails/route.ts
```
