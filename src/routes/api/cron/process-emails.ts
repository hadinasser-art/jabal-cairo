import { createFileRoute } from "@tanstack/react-router";
import { handleProcessEmailsRequest } from "../../../../lib/email/cronHandler";

export const Route = createFileRoute("/api/cron/process-emails")({
  server: {
    handlers: {
      GET: async ({ request }) => handleProcessEmailsRequest(request),
      POST: async ({ request }) => handleProcessEmailsRequest(request),
    },
  },
});
