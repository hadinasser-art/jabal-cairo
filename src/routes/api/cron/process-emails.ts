import { createFileRoute } from "@tanstack/react-router";
import { handleProcessEmailsRequest } from "../../../../lib/email/cronHandler";

const methodNotAllowed = () => Response.json({ error: "Method not allowed" }, { status: 405 });

export const Route = createFileRoute("/api/cron/process-emails")({
  server: {
    handlers: {
      GET: async ({ request }) => handleProcessEmailsRequest(request),
      POST: async ({ request }) => handleProcessEmailsRequest(request),
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
    },
  },
});
