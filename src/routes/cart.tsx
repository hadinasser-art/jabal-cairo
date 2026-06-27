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
        <div className="px-6 md:px-12 py-32 text-center max-w-3xl mx-auto">
          <h1 className="font-black uppercase" style={{ fontSize: "clamp(2rem, 6vw, 4rem)", letterSpacing: "-0.03em" }}>
            Your Cart Is Empty
          </h1>
          <Link to="/shop" className="jabal-btn mt-10">Back to Shop</Link>
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
      const rows = items.map((it) => ({
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: form.address.trim(),
        item_id: it.id,
        item_name: it.name,
        quantity: it.quantity,
        total_price_egp: it.price_egp * it.quantity,
      }));
      const { data, error } = await supabase.from("orders").insert(rows).select("order_id");
      if (error) throw error;
      const orderId = (data?.[0] as { order_id: string } | undefined)?.order_id;
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
        <h1 className="font-black uppercase mb-10" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.03em" }}>
          Cart
        </h1>

        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div>
            {items.map((it) => (
              <div
                key={`${it.id}-${it.selectedSize}-${it.selectedColor}`}
                className="flex gap-4 md:gap-6 py-6 border-b border-black/10"
              >
                <div className="w-24 md:w-32 aspect-[3/4] bg-black/5 shrink-0">
                  {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="font-bold uppercase tracking-[-0.01em]">{it.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.1em] opacity-60">
                    {[it.selectedSize, it.selectedColor].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-2 text-sm font-bold">{formatPrice(it.price_egp)}</div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <input
                      type="number"
                      min={1}
                      max={it.stock_quantity}
                      value={it.quantity}
                      onChange={(e) =>
                        updateQty(it.id, it.selectedSize, it.selectedColor, Number(e.target.value) || 1)
                      }
                      className="jabal-input"
                      style={{ width: 80, padding: "8px 10px" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(it.id, it.selectedSize, it.selectedColor)}
                      className="text-sm uppercase tracking-[0.1em] font-bold underline"
                      aria-label="Remove"
                    >
                      × Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-white border-[1.5px] border-black p-6 self-start">
            <h2 className="font-black uppercase text-xl tracking-[-0.02em] mb-4">Order Summary</h2>
            <div className="flex justify-between text-sm font-bold uppercase tracking-[0.1em] py-2">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-black uppercase border-t-[1.5px] border-black mt-2 pt-3">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="jabal-label">Full Name</label>
                <input
                  className="jabal-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="jabal-label">Email</label>
                <input
                  type="email"
                  className="jabal-input"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="jabal-label">Phone</label>
                <input
                  className="jabal-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="jabal-label">Shipping Address</label>
                <textarea
                  className="jabal-textarea"
                  rows={4}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              {error && (
                <div className="bg-black text-white px-4 py-3 text-xs uppercase tracking-[0.1em] font-bold">
                  {error}
                </div>
              )}
              <button type="submit" disabled={submitting} className="jabal-btn w-full">
                {submitting ? "Placing Order…" : "Place Order Request"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
