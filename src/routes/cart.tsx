import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { supabase, formatPrice } from "@/lib/supabase";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, removeItem, updateQty, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Layout>
        <div className="px-6 md:px-12 py-32 text-center max-w-2xl mx-auto">
          <div className="jb-eyebrow">Your bag</div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              marginTop: 12,
            }}
          >
            Your bag is empty.
          </h1>
          <p style={{ marginTop: 16, color: "var(--jb-muted)", fontSize: 14 }}>
            Find something you love from the new collection.
          </p>
          <div className="mt-10">
            <Link to="/shop" className="jb-btn">Shop the collection</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("place_order", {
        p_customer_name: form.name.trim(),
        p_customer_email: form.email.trim(),
        p_customer_phone: form.phone.trim(),
        p_shipping_address: form.address.trim(),
        p_items: JSON.stringify(items.map((it) => ({
          item_id: it.id,
          item_name: it.name,
          quantity: it.quantity,
          total_price_egp: it.price_egp * it.quantity,
        }))),
      });
      if (error) throw error;
      const orderId = data as string;
      if (!orderId) throw new Error("Order created but no order_id returned.");

      try {
        sessionStorage.setItem(
          "jabal_last_order",
          JSON.stringify({
            order_id: orderId,
            items: items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              price_egp: it.price_egp,
              selectedSize: it.selectedSize,
              selectedColor: it.selectedColor,
            })),
            total: subtotal,
          }),
        );
      } catch {}

      clear();
      navigate({ to: "/confirmation", search: { order_id: orderId } as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="px-6 md:px-12 py-12 max-w-7xl mx-auto w-full">
        <div className="jb-eyebrow">Checkout</div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            marginTop: 8,
            marginBottom: 40,
          }}
        >
          Your bag
        </h1>

        <div className="grid lg:grid-cols-[1fr_420px] gap-12">
          <div>
            {items.map((it) => (
              <div
                key={`${it.id}-${it.selectedSize}-${it.selectedColor}`}
                className="flex gap-5 md:gap-6 py-6"
                style={{ borderBottom: "1px solid var(--jb-line)" }}
              >
                <div
                  className="w-24 md:w-28 aspect-[3/4] shrink-0"
                  style={{ background: "var(--jb-product-bg)" }}
                >
                  {it.image_url && (
                    <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <div style={{ fontSize: 14, color: "var(--jb-ink)" }}>{it.name}</div>
                  <div
                    className="mt-1"
                    style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
                  >
                    {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: "var(--jb-muted)" }}>
                    {formatPrice(it.price_egp)}
                  </div>
                  <div className="mt-auto flex items-center gap-4 pt-3">
                    <input
                      type="number"
                      min={1}
                      max={it.stock_quantity}
                      value={it.quantity}
                      onChange={(e) =>
                        updateQty(it.id, it.selectedSize, it.selectedColor, Number(e.target.value) || 1)
                      }
                      className="jb-input"
                      style={{ width: 72, padding: "8px 10px" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.id, it.selectedSize, it.selectedColor)}
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--jb-muted)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textUnderlineOffset: 4,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "var(--jb-ink)" }}>
                  {formatPrice(it.price_egp * it.quantity)}
                </div>
              </div>
            ))}
          </div>

          <aside
            className="self-start p-6 md:p-8"
            style={{ background: "var(--jb-bg-warm)", border: "1px solid var(--jb-line)" }}
          >
            <div className="jb-eyebrow">Summary</div>
            <div
              className="flex justify-between py-3 mt-2"
              style={{ fontSize: 14, color: "var(--jb-muted)" }}
            >
              <span>Subtotal</span>
              <span style={{ color: "var(--jb-ink)" }}>{formatPrice(subtotal)}</span>
            </div>
            <div
              className="flex justify-between py-3"
              style={{ fontSize: 14, color: "var(--jb-muted)" }}
            >
              <span>Shipping</span>
              <span style={{ color: "var(--jb-ink)" }}>Calculated next</span>
            </div>
            <div
              className="flex justify-between pt-4 mt-2"
              style={{ borderTop: "1px solid var(--jb-line)", fontSize: 16, color: "var(--jb-ink)" }}
            >
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label className="jb-label">Full name</label>
                <input
                  className="jb-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">Email</label>
                <input
                  type="email"
                  className="jb-input"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">Phone</label>
                <input
                  className="jb-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">Shipping address</label>
                <textarea
                  className="jb-textarea"
                  rows={4}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              {error && (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--jb-ink)",
                    padding: "10px 14px",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--jb-ink)",
                  }}
                >
                  {error}
                </div>
              )}
              <button type="submit" disabled={submitting} className="jb-btn w-full">
                {submitting ? "Placing order…" : "Place order"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
