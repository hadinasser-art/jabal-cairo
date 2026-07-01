import { handleProcessEmailsRequest } from "../../../../lib/email/cronHandler";

// This file is provided for teams that later move JABAL to Next.js.
// The active endpoint in this TanStack Start app is:
// src/routes/api/cron/process-emails.ts
export const GET = handleProcessEmailsRequest;
export const POST = handleProcessEmailsRequest;
