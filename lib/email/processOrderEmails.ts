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
  pending: "order_received",
  confirmed: "order_confirmed",
  shipped: "out_for_delivery",
  paid: "payment_received",
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

  const { data, error } = await supabase
    .from("combined_orders")
    .select("id,order_id,customer_email,customer_name,status,total_price_egp,created_at,updated_at")
    .in("status", ["pending", "confirmed", "paid", "shipped", "delivered"])
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error)
    throw new Error(`Could not fetch combined orders for email processing: ${error.message}`);

  const results: SendOrderEmailResult[] = [];
  for (const row of data ?? []) {
    const order: EmailOrder = {
      id: row.id,
      order_number: row.order_id,
      customer_email: row.customer_email,
      customer_name: row.customer_name,
      order_status: row.status,
      payment_status: row.status === "paid" ? "paid" : null,
      checkout_status: null,
      total: Number(row.total_price_egp ?? 0),
      currency: "EGP",
      created_at: row.created_at,
      updated_at: row.updated_at,
      abandoned_email_sent_at: null,
    };
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
