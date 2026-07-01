import { getEnv } from "./env";
import { processOrderEmails } from "./processOrderEmails";

function isAuthorized(request: Request) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function handleProcessEmailsRequest(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processOrderEmails();
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email processing failed";
    return Response.json({ error: message, sent: 0, skipped: 0, failed: 1 }, { status: 500 });
  }
}
