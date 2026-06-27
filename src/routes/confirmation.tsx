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
      <div className="max-w-[640px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="inline-block bg-black text-white px-4 py-[6px] text-xs uppercase tracking-[0.15em] font-bold">
          Order Confirmed
        </div>

        <div
          className="mt-6 font-black uppercase"
          style={{ fontSize: "clamp(2rem, 8vw, 3rem)", letterSpacing: "0.05em", lineHeight: 1 }}
        >
          {orderId}
        </div>
        <button
          type="button"
          onClick={copy}
          className="mt-3 text-xs uppercase tracking-[0.15em] font-bold underline"
        >
          {copied ? "Copied ✓" : "Tap to copy"}
        </button>

        <div className="border-t-[3px] border-black my-10" />

        <h2 className="font-black uppercase text-xl md:text-2xl tracking-[-0.02em]">
          How to Complete Your Payment
        </h2>

        <div className="mt-6 bg-black text-white p-6 md:p-8">
          <div className="text-sm uppercase tracking-[0.1em] opacity-80">
            Send your total to our InstaPay number:
          </div>
          <div className="mt-3 font-bold" style={{ fontSize: "1.4rem", letterSpacing: "0.05em" }}>
            01001234567
          </div>
          <div className="mt-6 text-sm uppercase tracking-[0.1em] opacity-80">
            Use your Order ID as the payment reference or note:
          </div>
          <div className="mt-2 font-black uppercase" style={{ fontSize: "1.3rem", letterSpacing: "0.05em" }}>
            {orderId}
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.1em] font-bold border-t border-white/20 pt-4">
            ⚠ Your order will NOT be processed without the correct reference.
          </div>
        </div>

        {stored && (
          <>
            <div className="border-t-[3px] border-black my-10" />
            <h2 className="font-black uppercase text-lg tracking-[-0.02em] mb-4">Order Details</h2>
            <div className="border-[1.5px] border-black">
              {stored.items.map((it, idx) => (
                <div key={idx} className="flex justify-between p-4 border-b border-black/10 last:border-b-0">
                  <div>
                    <div className="font-bold uppercase text-sm">{it.name}</div>
                    <div className="text-xs uppercase tracking-[0.1em] opacity-60 mt-1">
                      {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")} · Qty {it.quantity}
                    </div>
                  </div>
                  <div className="font-bold text-sm">{formatPrice(it.price_egp * it.quantity)}</div>
                </div>
              ))}
              <div className="flex justify-between p-4 bg-black text-white">
                <div className="font-black uppercase tracking-[0.1em]">Total</div>
                <div className="font-black">{formatPrice(stored.total)}</div>
              </div>
            </div>
          </>
        )}

        <div className="border-t-[3px] border-black my-10" />

        <h2 className="font-black uppercase text-xl md:text-2xl tracking-[-0.02em]">What Happens Next</h2>
        <ol className="mt-6 space-y-4">
          {[
            "We receive your transfer and match it to your order ID.",
            "We confirm your payment and begin preparing your order.",
            "We ship to your address and send you tracking info.",
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-black text-2xl shrink-0" style={{ letterSpacing: "-0.03em" }}>
                {i + 1}.
              </span>
              <span className="text-sm md:text-base leading-relaxed pt-1">{step}</span>
            </li>
          ))}
        </ol>

        <div className="border-t-[3px] border-black my-10" />

        <Link to="/shop" className="jabal-btn w-full">Back to Shop</Link>
      </div>
    </Layout>
  );
}
