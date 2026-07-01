import { requireEnv } from "./env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export async function sendResendEmail(input: SendEmailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: requireEnv("EMAIL_FROM"),
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as ResendSendResponse;

  if (!response.ok) {
    throw new Error(data.message || data.name || `Resend request failed with ${response.status}`);
  }

  if (!data.id) throw new Error("Resend did not return a message id.");
  return data.id;
}
