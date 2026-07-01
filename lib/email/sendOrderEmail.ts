import { sendResendEmail } from "./resend";
import { createSupabaseAdmin } from "./supabaseAdmin";
import { type EmailOrder, type EmailType, renderOrderEmail } from "./templates";

export type SendOrderEmailResult = {
  status: "sent" | "skipped" | "failed";
  emailType: EmailType;
  orderId: string;
  error?: string;
};

export async function sendOrderEmail(
  order: EmailOrder,
  emailType: EmailType,
): Promise<SendOrderEmailResult> {
  const supabase = createSupabaseAdmin();

  const { data: existingSent, error: existingError } = await supabase
    .from("email_logs")
    .select("id")
    .eq("order_id", order.id)
    .eq("email_type", emailType)
    .eq("status", "sent")
    .maybeSingle();

  if (existingError) {
    return {
      status: "failed",
      emailType,
      orderId: order.id,
      error: existingError.message,
    };
  }

  if (existingSent) {
    return { status: "skipped", emailType, orderId: order.id };
  }

  try {
    const rendered = renderOrderEmail(emailType, order);
    const resendMessageId = await sendResendEmail({
      to: order.customer_email,
      subject: rendered.subject,
      html: rendered.html,
    });

    const { error: logError } = await supabase.from("email_logs").insert({
      order_id: order.id,
      email_type: emailType,
      recipient_email: order.customer_email,
      status: "sent",
      resend_message_id: resendMessageId,
      sent_at: new Date().toISOString(),
    });

    if (logError) throw logError;

    if (emailType === "abandoned_checkout") {
      await supabase
        .from("orders")
        .update({ abandoned_email_sent_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    return { status: "sent", emailType, orderId: order.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";

    await supabase.from("email_logs").insert({
      order_id: order.id,
      email_type: emailType,
      recipient_email: order.customer_email,
      status: "failed",
      error_message: message,
    });

    return {
      status: "failed",
      emailType,
      orderId: order.id,
      error: message,
    };
  }
}
