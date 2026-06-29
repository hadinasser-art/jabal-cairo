import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { formatPrice, JABAL_SUPPORT_EMAIL } from "@/lib/supabase";

type Search = { order_id?: string };

export const Route = createFileRoute("/confirmation")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    order_id: typeof search.order_id === "string" ? search.order_id : undefined,
  }),
  component: ConfirmationPage,
});

type StoredOrder = {
  order_id: string;
  items: { name: string; quantity: number; price_egp: number; selectedSize: string | null; selectedColor: string | null; image_url?: string | null }[];
  subtotal?: number;
  discount?: number;
  total: number;
  payment_method?: "cod" | "instapay";
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

  const isInstapay = stored?.payment_method === "instapay";

  return (
    <Layout>
      <div className="max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="jb-eyebrow">Order confirmed</div>
        <h1 style={{ marginTop: 12, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 300, color: "#fff" }}>
          Thank you for your order.
        </h1>

        <div className="mt-8 p-6" style={{ background: "#0a0a0a", border: "1px solid #262626" }}>
          <div className="jb-eyebrow">Order ID</div>
          <div className="mt-2" style={{ fontSize: 24, letterSpacing: "0.05em", color: "#fff", fontWeight: 500 }}>{orderId}</div>
          <button onClick={copy} style={{ marginTop: 10, fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fff", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>
            {copied ? "Copied ✓" : "Tap to copy"}
          </button>
        </div>

        <div className="mt-8 p-6 md:p-8" style={{ background: "#fff", color: "#000" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555" }}>
            {isInstapay ? "InstaPay" : "Cash on Delivery"}
          </div>
          <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>
            {isInstapay ? "Send the InstaPay transfer to: 01061024345" : "You will pay when your order arrives."}
          </div>
        </div>

        {stored && stored.items.length > 0 && (
          <>
            <div className="jb-eyebrow mt-10">Summary</div>
            <div className="mt-4" style={{ border: "1px solid #262626" }}>
              {stored.items.map((it, idx) => (
                <div key={idx} className="flex justify-between p-4" style={{ borderBottom: "1px solid #262626", fontSize: 14 }}>
                  <div>
                    <div style={{ color: "#fff" }}>{it.name}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a", marginTop: 4 }}>
                      {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")} · Qty {it.quantity}
                    </div>
                  </div>
                  <div style={{ color: "#fff" }}>{formatPrice(it.price_egp * it.quantity)}</div>
                </div>
              ))}
              {typeof stored.subtotal === "number" && (
                <div className="flex justify-between p-4" style={{ borderBottom: "1px solid #262626", fontSize: 13, color: "#9a9a9a" }}>
                  <span>Subtotal</span><span style={{ color: "#fff" }}>{formatPrice(stored.subtotal)}</span>
                </div>
              )}
              {typeof stored.discount === "number" && stored.discount > 0 && (
                <div className="flex justify-between p-4" style={{ borderBottom: "1px solid #262626", fontSize: 13, color: "#9a9a9a" }}>
                  <span>Discount</span><span style={{ color: "#fff" }}>− {formatPrice(stored.discount)}</span>
                </div>
              )}
              <div className="flex justify-between p-4" style={{ background: "#0a0a0a", fontSize: 14 }}>
                <div style={{ color: "#fff" }}>Total</div>
                <div style={{ color: "#fff" }}>{formatPrice(stored.total)}</div>
              </div>
            </div>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/shop" className="jb-btn">Continue shopping</Link>
          <Link to="/account" className="jb-btn-ghost">View orders</Link>
        </div>

        <div style={{ marginTop: 28, fontSize: 12, color: "#9a9a9a" }}>
          Need help? <a href={`mailto:${JABAL_SUPPORT_EMAIL}`} style={{ color: "#fff" }} className="hover:underline">{JABAL_SUPPORT_EMAIL}</a>
        </div>
      </div>
    </Layout>
  );
}
