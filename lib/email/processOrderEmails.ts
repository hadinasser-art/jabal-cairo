import { sendOrderEmail, type SendOrderEmailResult } from "./sendOrderEmail";
import { createSupabaseAdmin } from "./supabaseAdmin";
import { type EmailOrder, type EmailType } from "./templates";

export type ProcessOrderEmailsResult = {
  sent: number;
  skipped: number;
  failed: number;
  results: SendOrderEmailResult[];
};

const ORDER_STATUS_EMAILS: Record<string, EmailType> = {
  order_received: "order_received",
  order_confirmed: "order_confirmed",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

function getEmailTypesForOrder(order: EmailOrder, now = Date.now()): EmailType[] {
  const types: EmailType[] = [];
  const statusEmail = order.order_status ? ORDER_STATUS_EMAILS[order.order_status] : undefined;
  if (statusEmail) types.push(statusEmail);
  if (order.payment_status === "paid") types.push("payment_received");

  const createdAt = new Date(order.created_at).getTime();
  const abandonedIsOldEnough = Number.isFinite(createdAt) && now - createdAt >= 60 * 60 * 1000;
  if (
    order.checkout_status === "abandoned" &&
    abandonedIsOldEnough &&
    !order.abandoned_email_sent_at
  ) {
    types.push("abandoned_checkout");
  }

  return types;
}

export async function processOrderEmails(): Promise<ProcessOrderEmailsResult> {
  const supabase = createSupabaseAdmin();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,customer_email,customer_name,order_status,payment_status,checkout_status,total,currency,created_at,updated_at,abandoned_email_sent_at",
    )
    .or(
      [
        "order_status.in.(order_received,order_confirmed,out_for_delivery,delivered)",
        "payment_status.eq.paid",
        `and(checkout_status.eq.abandoned,created_at.lte.${cutoff},abandoned_email_sent_at.is.null)`,
      ].join(","),
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Could not fetch orders for email processing: ${error.message}`);

  const results: SendOrderEmailResult[] = [];
  for (const order of (data ?? []) as EmailOrder[]) {
    for (const emailType of getEmailTypesForOrder(order)) {
      results.push(await sendOrderEmail(order, emailType));
    }
  }

  return {
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
