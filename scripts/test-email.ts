import { sendResendEmail } from "../lib/email/resend";
import { renderOrderEmail, type EmailOrder } from "../lib/email/templates";

const sampleOrder: EmailOrder = {
  id: "JBL-TEST-0001",
  customer_email: "test@example.com",
  customer_name: "JABAL Test Customer",
  order_status: "order_received",
  payment_status: "pending",
  checkout_status: "completed",
  total: 850,
  currency: "EGP",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  abandoned_email_sent_at: null,
};

const recipient = process.argv[2] || sampleOrder.customer_email;
const rendered = renderOrderEmail("order_received", { ...sampleOrder, customer_email: recipient });

sendResendEmail({
  to: recipient,
  subject: `[TEST] ${rendered.subject}`,
  html: rendered.html,
})
  .then((messageId) => {
    console.log(`Test email sent: ${messageId}`);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
