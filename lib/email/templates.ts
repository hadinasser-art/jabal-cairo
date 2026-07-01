import { getEnv } from "./env";

export type EmailType =
  | "order_received"
  | "order_confirmed"
  | "payment_received"
  | "out_for_delivery"
  | "delivered"
  | "abandoned_checkout";

export type EmailOrder = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  order_status: string | null;
  payment_status: string | null;
  checkout_status: string | null;
  total: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
  abandoned_email_sent_at: string | null;
};

type TemplateContent = {
  subject: string;
  preview: string;
  headline: string;
  body: string;
  ctaLabel: string;
};

function money(order: EmailOrder) {
  const currency = order.currency || "EGP";
  const amount = Number(order.total ?? 0).toLocaleString("en-EG");
  return `${currency} ${amount}`;
}

function orderUrl(order: EmailOrder) {
  const baseUrl = getEnv("NEXT_PUBLIC_SITE_URL") || "";
  return `${baseUrl.replace(/\/$/, "")}/account?order=${encodeURIComponent(order.order_number)}`;
}

function getTemplateContent(type: EmailType, order: EmailOrder): TemplateContent {
  const total = money(order);

  const templates: Record<EmailType, TemplateContent> = {
    order_received: {
      subject: `JABAL received your order ${order.order_number}`,
      preview: "Your order has been received.",
      headline: "Order received",
      body: `We received your order and will review it shortly. Your current order total is ${total}.`,
      ctaLabel: "View order",
    },
    order_confirmed: {
      subject: `JABAL confirmed your order ${order.order_number}`,
      preview: "Your order is confirmed.",
      headline: "Order confirmed",
      body: `Your order is confirmed and being prepared. Your confirmed total is ${total}.`,
      ctaLabel: "View order",
    },
    payment_received: {
      subject: `Payment received for ${order.order_number}`,
      preview: "Your payment has been received.",
      headline: "Payment received",
      body: `We received your payment for order ${order.order_number}. Paid total: ${total}.`,
      ctaLabel: "View order",
    },
    out_for_delivery: {
      subject: `Your JABAL order is out for delivery`,
      preview: "Your order is on the way.",
      headline: "Out for delivery",
      body: "Your order is now out for delivery. Keep your phone nearby in case the courier needs to reach you.",
      ctaLabel: "Track order",
    },
    delivered: {
      subject: `Your JABAL order was delivered`,
      preview: "Your order has been delivered.",
      headline: "Delivered",
      body: "Your order has been marked as delivered. Thank you for shopping with JABAL.",
      ctaLabel: "Shop JABAL",
    },
    abandoned_checkout: {
      subject: "Your JABAL bag is waiting",
      preview: "Complete your checkout when you are ready.",
      headline: "Still thinking it over?",
      body: `Your JABAL checkout is still open. Complete your order when you are ready. Current bag total: ${total}.`,
      ctaLabel: "Return to checkout",
    },
  };

  return templates[type];
}

export function renderOrderEmail(type: EmailType, order: EmailOrder) {
  const customerName = order.customer_name?.trim() || "there";
  const content = getTemplateContent(type, order);
  const href =
    type === "abandoned_checkout"
      ? `${getEnv("NEXT_PUBLIC_SITE_URL") || ""}/cart`
      : orderUrl(order);
  const status =
    type === "payment_received"
      ? order.payment_status || "paid"
      : order.order_status || order.checkout_status || type;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${content.subject}</title>
  </head>
  <body style="margin:0;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${content.preview}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#050505;border:1px solid #262626;">
            <tr>
              <td style="padding:32px 28px 20px;text-align:center;border-bottom:1px solid #262626;">
                <div style="font-size:32px;letter-spacing:0.22em;font-weight:700;color:#fff;">JABAL</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a9a9a;">Order ${order.order_number}</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:400;color:#fff;">${content.headline}</h1>
                <p style="margin:22px 0 0;font-size:15px;line-height:1.7;color:#d8d8d8;">Hi ${customerName},</p>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#d8d8d8;">${content.body}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;border-top:1px solid #262626;border-bottom:1px solid #262626;">
                  <tr>
                    <td style="padding:14px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">Status</td>
                    <td align="right" style="padding:14px 0;font-size:13px;color:#fff;">${status}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 14px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a9a9a;">Total</td>
                    <td align="right" style="padding:0 0 14px;font-size:13px;color:#fff;">${money(order)}</td>
                  </tr>
                </table>
                <a href="${href}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:14px 22px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">${content.ctaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #262626;color:#777;font-size:12px;line-height:1.6;">
                JABAL transactional email. If you did not place this order, contact support.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: content.subject, html };
}
