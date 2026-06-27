import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { formatPrice } from "@/lib/supabase";

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
};

function ConfirmationPage() {
  const { order_id } = Route.useSearch();
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

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="jb-eyebrow">Order confirmed</div>
        <h1
          style={{
            marginTop: 12,
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: "var(--jb-ink)",
          }}
        >
          Thank you for your order.
        </h1>
        <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7, color: "var(--jb-muted)" }}>
          A confirmation has been recorded. Complete payment via InstaPay below
          to begin processing.
        </p>

        <div
          className="mt-8 p-6"
          style={{ background: "var(--jb-bg-warm)", border: "1px solid var(--jb-line)" }}
        >
          <div className="jb-eyebrow">Order ID</div>
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
            {copied ? "Copied ✓" : "Tap to copy"}
          </button>
        </div>

        <div style={{ height: 1, background: "var(--jb-line)", margin: "40px 0" }} />

        <h2
          style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--jb-ink)" }}
        >
          Complete your payment
        </h2>

        <div
          className="mt-6 p-6 md:p-8"
          style={{ background: "#111", color: "#fff" }}
        >
          <div
            style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}
          >
            Send your total to our InstaPay number
          </div>
          <div style={{ marginTop: 12, fontSize: 22, letterSpacing: "0.05em" }}>
            01001234567
          </div>
          <div
            style={{ marginTop: 24, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}
          >
            Reference / note
          </div>
          <div style={{ marginTop: 8, fontSize: 18, letterSpacing: "0.05em" }}>
            {orderId}
          </div>
          <div
            className="mt-6 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}
          >
            Orders will not be processed without the correct reference.
          </div>
        </div>

        {stored && (
          <>
            <div style={{ height: 1, background: "var(--jb-line)", margin: "40px 0" }} />
            <div className="jb-eyebrow">Order details</div>
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
                      {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")} · Qty {it.quantity}
                    </div>
                  </div>
                  <div style={{ color: "var(--jb-ink)" }}>{formatPrice(it.price_egp * it.quantity)}</div>
                </div>
              ))}
              <div
                className="flex justify-between p-4"
                style={{ background: "var(--jb-bg-warm)", fontSize: 14 }}
              >
                <div style={{ color: "var(--jb-ink)" }}>Total</div>
                <div style={{ color: "var(--jb-ink)" }}>{formatPrice(stored.total)}</div>
              </div>
            </div>
          </>
        )}

        <div style={{ height: 1, background: "var(--jb-line)", margin: "40px 0" }} />

        <div className="jb-eyebrow">What happens next</div>
        <ol className="mt-4 space-y-3">
          {[
            "We receive your transfer and match it to your order ID.",
            "We confirm your payment and prepare your order.",
            "We ship to your address and send you tracking.",
          ].map((step, i) => (
            <li key={i} className="flex gap-4" style={{ fontSize: 14, color: "var(--jb-ink)" }}>
              <span style={{ color: "var(--jb-muted)", width: 20 }}>{(i + 1).toString().padStart(2, "0")}</span>
              <span style={{ lineHeight: 1.6 }}>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <Link to="/shop" className="jb-btn">Continue shopping</Link>
        </div>
      </div>
    </Layout>
  );
}
