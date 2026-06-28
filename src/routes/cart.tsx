import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { supabase, formatPrice } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

type PayMethod = "cod" | "instapay";

function CartPage() {
  const { items, removeItem, updateQty, subtotal, clear } = useCart();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [payment, setPayment] = useState<PayMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Layout>
        <div className="px-6 md:px-12 py-32 text-center max-w-2xl mx-auto">
          <div className="jb-eyebrow">{t("cart.empty.eyebrow")}</div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              marginTop: 12,
              color: "#fff",
            }}
          >
            {t("cart.empty.title")}
          </h1>
          <p style={{ marginTop: 16, color: "var(--jb-muted)", fontSize: 14 }}>
            {t("cart.empty.sub")}
          </p>
          <div className="mt-10">
            <Link to="/shop" className="jb-btn">{t("cart.empty.cta")}</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError(t("cart.empty.title"));
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t("form.error.fields"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t("form.error.email"));
      return;
    }
    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
      setError(t("form.error.phone"));
      return;
    }
    setSubmitting(true);
    try {
      // Generate one order_id via RPC
      const { data: orderIdData, error: orderIdError } = await supabase.rpc("generate_order_id");
      if (orderIdError) throw new Error("Could not generate order ID: " + orderIdError.message);
      const orderId = orderIdData as string;

      const totalItems = items.reduce((s, it) => s + it.quantity, 0);
      const orderSummary = items
        .map((it) => {
          const meta = [it.selectedColor, it.selectedSize].filter(Boolean).join(", ");
          return `${it.name} x${it.quantity}${meta ? ", " + meta : ""}`;
        })
        .join(" | ");

      // 1) Insert ONE combined row
      const { error: combinedError } = await supabase.from("combined_orders").insert({
        order_id: orderId,
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: form.address.trim(),
        order_summary: orderSummary,
        total_items: totalItems,
        subtotal_egp: subtotal,
        shipping_fee_egp: 0,
        discount_egp: 0,
        total_price_egp: subtotal,
        payment_method: payment === "instapay" ? "instapay" : "cod",
        status: "pending",
      });
      if (combinedError) throw new Error("Could not save order: " + combinedError.message);

      // 2) Insert per-item rows sharing the same order_id
      const rows = items.map((it) => ({
        order_id: orderId,
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: form.address.trim(),
        item_id: it.id,
        item_name: it.name,
        quantity: it.quantity,
        total_price_egp: it.price_egp * it.quantity,
      }));
      const { error: insertError } = await supabase.from("orders").insert(rows);
      if (insertError) throw new Error("Could not save order items: " + insertError.message);

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
            payment_method: payment,
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
        <div className="jb-eyebrow">{t("cart.eyebrow")}</div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            marginTop: 8,
            marginBottom: 40,
            color: "#fff",
          }}
        >
          {t("cart.title")}
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
                      {t("cart.remove")}
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
            <div className="jb-eyebrow">{t("cart.summary")}</div>
            <div className="flex justify-between py-3 mt-2" style={{ fontSize: 14, color: "var(--jb-muted)" }}>
              <span>{t("cart.subtotal")}</span>
              <span style={{ color: "var(--jb-ink)" }}>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between py-3" style={{ fontSize: 14, color: "var(--jb-muted)" }}>
              <span>{t("cart.shipping")}</span>
              <span style={{ color: "var(--jb-ink)" }}>{t("cart.shipping.next")}</span>
            </div>
            <div
              className="flex justify-between pt-4 mt-2"
              style={{ borderTop: "1px solid var(--jb-line)", fontSize: 16, color: "var(--jb-ink)" }}
            >
              <span>{t("cart.total")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4" dir={dir}>
              <div>
                <label className="jb-label">{t("form.name")}</label>
                <input
                  className="jb-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">{t("form.email")}</label>
                <input
                  type="email"
                  className="jb-input"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">{t("form.phone")}</label>
                <input
                  className="jb-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="jb-label">{t("form.address")}</label>
                <textarea
                  className="jb-textarea"
                  rows={4}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              {/* Payment method */}
              <div>
                <label className="jb-label">{t("form.payment")}</label>
                <div className="space-y-2">
                  {(["cod", "instapay"] as PayMethod[]).map((pm) => {
                    const sel = payment === pm;
                    return (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPayment(pm)}
                        style={{
                          width: "100%",
                          textAlign: dir === "rtl" ? "right" : "left",
                          padding: "12px 14px",
                          background: sel ? "#fff" : "transparent",
                          color: sel ? "#000" : "#fff",
                          border: `1px solid ${sel ? "#fff" : "var(--jb-line)"}`,
                          fontSize: 12,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {pm === "cod" ? t("pay.cod") : t("pay.instapay")}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="mt-3"
                  style={{ fontSize: 12, lineHeight: 1.6, color: "var(--jb-muted)" }}
                >
                  {payment === "instapay" ? t("pay.instapay.note") : t("pay.cod.note")}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    border: "1px solid #fff",
                    padding: "10px 14px",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#fff",
                  }}
                >
                  {error}
                </div>
              )}
              <button type="submit" disabled={submitting || items.length === 0} className="jb-btn w-full">
                {submitting ? t("form.placing") : t("form.place")}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
