import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { formatPrice } from "@/lib/supabase";
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
  items: { name: string; quantity: number; price_egp: number; selectedSize: string | null; selectedColor: string | null }[];
  total: number;
  payment_method?: "cod" | "instapay";
};

function ConfirmationPage() {
  const { order_id } = Route.useSearch();
  const { t } = useI18n();
  const orderId = order_id || "JBL-XXXX";
  const [stored, setStored] = useState<StoredOrder | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("jabal_last_order");
      if (raw) setStored(JSON.parse(raw));
    } catch {}
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isInstapay = stored?.payment_method === "instapay";

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="jb-eyebrow">{t("ok.eyebrow")}</div>
        <h1
          style={{
            marginTop: 12,
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "var(--jb-ink)",
          }}
        >
          {t("ok.title")}
        </h1>

        <div
          className="mt-8 p-6"
          style={{ background: "var(--jb-bg-warm)", border: "1px solid var(--jb-line)" }}
        >
          <div className="jb-eyebrow">{t("ok.orderid")}</div>
          <div
            className="mt-2"
            style={{ fontSize: 24, letterSpacing: "0.05em", color: "var(--jb-ink)", fontWeight: 500 }}
          >
            {orderId}
          </div>
          <button
            type="button"
            onClick={copy}
            style={{
              marginTop: 10,
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--jb-ink)",
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

        <div style={{ height: 1, background: "var(--jb-line)", margin: "32px 0" }} />

        <div
          className="p-6 md:p-8"
          style={{ background: "#fff", color: "#000" }}
        >
          <div
            style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555" }}
          >
            {isInstapay ? t("pay.instapay") : t("pay.cod")}
          </div>
          <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>
            {isInstapay ? t("pay.instapay.note") : t("pay.cod.note")}
          </div>
          {isInstapay && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid #e5e5e5", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#555" }}
            >
              {t("ok.orderid")}: {orderId}
            </div>
          )}
        </div>

        {stored && stored.items.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--jb-line)", margin: "32px 0" }} />
            <div className="jb-eyebrow">{t("cart.summary")}</div>
            <div className="mt-4" style={{ border: "1px solid var(--jb-line)" }}>
              {stored.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between p-4"
                  style={{ borderBottom: "1px solid var(--jb-line)", fontSize: 14 }}
                >
                  <div>
                    <div style={{ color: "var(--jb-ink)" }}>{it.name}</div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
                    >
                      {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")} · {t("cart.qty")} {it.quantity}
                    </div>
                  </div>
                  <div style={{ color: "var(--jb-ink)" }}>{formatPrice(it.price_egp * it.quantity)}</div>
                </div>
              ))}
              <div
                className="flex justify-between p-4"
                style={{ background: "var(--jb-bg-warm)", fontSize: 14 }}
              >
                <div style={{ color: "var(--jb-ink)" }}>{t("cart.total")}</div>
                <div style={{ color: "var(--jb-ink)" }}>{formatPrice(stored.total)}</div>
              </div>
            </div>
          </>
        )}

        <div className="mt-10">
          <Link to="/shop" className="jb-btn">{t("ok.continue")}</Link>
        </div>
      </div>
    </Layout>
  );
}
