import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { formatPrice, JABAL_SUPPORT_EMAIL } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type Search = { order_id?: string };

export const Route = createFileRoute("/confirmation")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    order_id: typeof search.order_id === "string" ? search.order_id : undefined,
  }),
  component: ConfirmationPage,
});

type StoredOrder = {
  order_id: string;
  items: {
    name: string;
    quantity: number;
    price_egp: number;
    selectedSize: string | null;
    selectedColor: string | null;
    image_url?: string | null;
  }[];
  subtotal?: number;
  discount?: number;
  discounts?: { title: string; amount: number }[];
  shipping_fee?: number;
  total: number;
  payment_method?: "cod" | "instapay";
  payment_status?: string;
  order_status?: string;
};

function ConfirmationPage() {
  const { order_id } = Route.useSearch();
  const orderId = order_id || "JBL-XXXX";
  const [stored, setStored] = useState<StoredOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("jabal_last_order");
      if (raw) setStored(JSON.parse(raw));
    } catch {
      // Ignore malformed session storage data.
    }
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some browser contexts.
    }
  };

  const isInstapay = stored?.payment_method === "instapay";
  const paymentStatus = stored?.payment_status ?? (isInstapay ? "pending" : "cod_pending");
  const orderStatus = stored?.order_status ?? (isInstapay ? "new" : "confirmed");

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="jb-eyebrow">{t("ok.eyebrow")}</div>
        <h1
          style={{
            marginTop: 12,
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 300,
            color: "#fff",
          }}
        >
          {t("ok.title")}
        </h1>

        <div className="mt-8 p-6" style={{ background: "#0a0a0a", border: "1px solid #262626" }}>
          <div className="jb-eyebrow">{t("ok.orderid")}</div>
          <div
            className="mt-2"
            style={{
              fontSize: 24,
              letterSpacing: "0.05em",
              color: "#fff",
              fontWeight: 500,
              overflowWrap: "anywhere",
            }}
          >
            {orderId}
          </div>
          <button
            onClick={copy}
            style={{
              marginTop: 10,
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#fff",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            {copied ? t("ok.copied") : t("ok.copy")}
          </button>
        </div>

        <div className="mt-8 p-6 md:p-8" style={{ background: "#fff", color: "#000" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#555",
            }}
          >
            {isInstapay ? t("pay.instapay") : t("pay.cod.full")}
          </div>
          <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>
            {isInstapay ? t("pay.instapay.note") : t("pay.cod.note")}
          </div>
          <div style={{ marginTop: 18, fontSize: 12, letterSpacing: "0.08em" }}>
            {t("status.payment")}: {statusLabel(paymentStatus)} · {t("status.order")}:{" "}
            {statusLabel(orderStatus)}
          </div>
        </div>

        {stored && stored.items.length > 0 && (
          <>
            <div className="jb-eyebrow mt-10">{t("cart.summary")}</div>
            <div className="mt-4" style={{ border: "1px solid #262626" }}>
              {stored.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between gap-3 p-4"
                  style={{ borderBottom: "1px solid #262626", fontSize: 14 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#fff" }}>{it.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "#9a9a9a",
                        marginTop: 4,
                      }}
                    >
                      {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")} · Qty{" "}
                      {it.quantity}
                    </div>
                  </div>
                  <div style={{ color: "#fff", whiteSpace: "nowrap" }}>
                    {formatPrice(it.price_egp * it.quantity)}
                  </div>
                </div>
              ))}
              {typeof stored.subtotal === "number" && (
                <div
                  className="flex justify-between p-4"
                  style={{ borderBottom: "1px solid #262626", fontSize: 13, color: "#9a9a9a" }}
                >
                  <span>{t("cart.subtotal")}</span>
                  <span style={{ color: "#fff" }}>{formatPrice(stored.subtotal)}</span>
                </div>
              )}
              {typeof stored.discount === "number" && stored.discount > 0 && (
                <>
                  {stored.discounts && stored.discounts.length > 0 ? (
                    stored.discounts.map((discount, idx) => (
                      <div
                        key={`${discount.title}-${idx}`}
                        className="flex justify-between gap-3 p-4"
                        style={{
                          borderBottom: "1px solid #262626",
                          fontSize: 13,
                          color: "#9a9a9a",
                        }}
                      >
                        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                          {discount.title}
                        </span>
                        <span style={{ color: "#fff", whiteSpace: "nowrap" }}>
                          - {formatPrice(discount.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div
                      className="flex justify-between p-4"
                      style={{ borderBottom: "1px solid #262626", fontSize: 13, color: "#9a9a9a" }}
                    >
                      <span>{t("cart.savings")}</span>
                      <span style={{ color: "#fff" }}>- {formatPrice(stored.discount ?? 0)}</span>
                    </div>
                  )}
                </>
              )}
              {typeof stored.shipping_fee === "number" && (
                <div
                  className="flex justify-between p-4"
                  style={{ borderBottom: "1px solid #262626", fontSize: 13, color: "#9a9a9a" }}
                >
                  <span>{t("cart.shipping")}</span>
                  <span style={{ color: "#fff" }}>{formatPrice(stored.shipping_fee)}</span>
                </div>
              )}
              <div
                className="flex justify-between p-4"
                style={{ background: "#0a0a0a", fontSize: 14 }}
              >
                <div style={{ color: "#fff" }}>{t("cart.total")}</div>
                <div style={{ color: "#fff" }}>{formatPrice(stored.total)}</div>
              </div>
            </div>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/shop" className="jb-btn">
            {t("ok.continue")}
          </Link>
          <Link to="/account" className="jb-btn-ghost">
            {t("ok.orders")}
          </Link>
        </div>

        <div style={{ marginTop: 28, fontSize: 12, color: "#9a9a9a" }}>
          {t("cart.questions")}{" "}
          <a
            href={`mailto:${JABAL_SUPPORT_EMAIL}`}
            style={{ color: "#fff" }}
            className="hover:underline"
          >
            {JABAL_SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </Layout>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}
