import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase, formatPrice, isUuid, EGYPT_GOVERNORATES, JABAL_SUPPORT_EMAIL } from "@/lib/supabase";
import { loadProfile, upsertProfile, markFirstOrderUsed } from "@/lib/profile";
import { fetchActivePopupOffer, computeDiscount, type Offer } from "@/lib/offer";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Checkout — JABAL" }] }),
  component: CartPage,
});

type PayMethod = "cod" | "instapay";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  full_address: string;
  city: string;
  governorate: string;
};

const empty: FormState = {
  first_name: "", last_name: "", email: "", phone: "",
  full_address: "", city: "", governorate: "",
};

function CartPage() {
  const { items, removeItem, updateQty, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [savePrefs, setSavePrefs] = useState(true);
  const [payment, setPayment] = useState<PayMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [eligibleForDiscount, setEligibleForDiscount] = useState(false);

  // Prefill from profile
  useEffect(() => {
    if (!user) return;
    loadProfile(user.id).then((p) => {
      if (p) {
        setForm({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          email: p.email ?? user.email ?? "",
          phone: p.phone ?? "",
          full_address: p.full_address ?? "",
          city: p.city ?? "",
          governorate: p.governorate ?? "",
        });
        setEligibleForDiscount(!p.first_order_discount_used);
      } else {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
        setEligibleForDiscount(true);
      }
    });
  }, [user]);

  useEffect(() => { fetchActivePopupOffer().then(setOffer); }, []);

  const discount = user && eligibleForDiscount && offer?.first_order_only ? computeDiscount(offer, subtotal) : 0;
  const shippingFee = 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  if (items.length === 0) {
    return (
      <Layout>
        <div className="px-6 md:px-12 py-32 text-center max-w-2xl mx-auto">
          <div className="jb-eyebrow">Your bag</div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 300, marginTop: 12, color: "#fff" }}>
            Your bag is empty.
          </h1>
          <p style={{ marginTop: 16, color: "#9a9a9a", fontSize: 14 }}>Find something you love.</p>
          <div className="mt-10"><Link to="/shop" className="jb-btn">Shop the collection</Link></div>
        </div>
      </Layout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const required: (keyof FormState)[] = ["first_name", "last_name", "email", "phone", "full_address", "city", "governorate"];
    for (const k of required) {
      if (!form[k].trim()) { setError("Please fill in all fields."); return; }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Please enter a valid email."); return; }
    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) { setError("Please enter a valid phone number."); return; }
    setSubmitting(true);
    try {
      const { data: orderIdData, error: orderIdError } = await supabase.rpc("generate_order_id");
      if (orderIdError) throw new Error("Could not generate order ID: " + orderIdError.message);
      const orderId = orderIdData as string;

      const customerName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const shippingAddress = `${form.full_address.trim()}, ${form.city.trim()}, ${form.governorate.trim()}`;
      const totalItems = items.reduce((s, it) => s + it.quantity, 0);
      const orderSummary = items.map((it) => {
        const meta = [it.selectedColor, it.selectedSize].filter(Boolean).join(", ");
        return `${it.name} x${it.quantity}${meta ? ", " + meta : ""}`;
      }).join(" | ");

      const combinedPayload: Record<string, unknown> = {
        order_id: orderId,
        customer_name: customerName,
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: shippingAddress,
        order_summary: orderSummary,
        total_items: totalItems,
        subtotal_egp: subtotal,
        shipping_fee_egp: shippingFee,
        discount_egp: discount,
        total_price_egp: total,
        payment_method: payment,
        status: "pending",
        user_id: user?.id ?? null,
      };
      if (discount > 0 && offer) {
        combinedPayload.offer_id = offer.id;
        combinedPayload.discount_amount_egp = discount;
      }

      const { error: combinedError } = await supabase.from("combined_orders").insert(combinedPayload);
      if (combinedError) throw new Error("Could not save order: " + combinedError.message);

      const rows = items.map((it) => ({
        order_id: orderId,
        customer_name: customerName,
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: shippingAddress,
        item_id: isUuid(it.id) ? it.id : null,
        item_name: it.name,
        quantity: it.quantity,
        total_price_egp: it.price_egp * it.quantity,
        user_id: user?.id ?? null,
      }));
      const { error: insertError } = await supabase.from("orders").insert(rows);
      if (insertError) throw new Error("Could not save order items: " + insertError.message);

      // Save profile + mark discount used
      if (user && savePrefs) {
        await upsertProfile({
          user_id: user.id,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          full_address: form.full_address.trim(),
          city: form.city.trim(),
          governorate: form.governorate.trim(),
        });
      }
      if (user && discount > 0) await markFirstOrderUsed(user.id);

      try {
        sessionStorage.setItem("jabal_last_order", JSON.stringify({
          order_id: orderId,
          items: items.map((it) => ({
            name: it.name, quantity: it.quantity, price_egp: it.price_egp,
            selectedSize: it.selectedSize, selectedColor: it.selectedColor,
            image_url: it.image_url,
          })),
          subtotal, discount, total, payment_method: payment,
        }));
      } catch {}

      clear();
      navigate({ to: "/confirmation", search: { order_id: orderId } as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = <K extends keyof FormState>(k: K, v: string) => setForm({ ...form, [k]: v });

  return (
    <Layout>
      <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto w-full">
        <div className="jb-eyebrow">Checkout</div>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 300, marginTop: 6, marginBottom: 32, color: "#fff" }}>
          Your bag
        </h1>

        {!user && (
          <div className="mb-8" style={{ border: "1px solid #262626", padding: 16, fontSize: 13, color: "#9a9a9a" }}>
            <Link to="/login" className="hover:underline" style={{ color: "#fff" }}>Log in</Link> for faster checkout and order history — or continue as a guest.
          </div>
        )}

        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-6">
            <Section title="Contact">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" v={form.first_name} on={(v) => set("first_name", v)} required />
                <Field label="Last name" v={form.last_name} on={(v) => set("last_name", v)} required />
              </div>
              <Field label="Email" type="email" v={form.email} on={(v) => set("email", v)} required />
              <Field label="Phone number" v={form.phone} on={(v) => set("phone", v)} required />
            </Section>

            <Section title="Shipping address">
              <Field label="Full address" v={form.full_address} on={(v) => set("full_address", v)} required textarea />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" v={form.city} on={(v) => set("city", v)} required />
                <div>
                  <label className="jb-label">Governorate</label>
                  <select className="jb-select" required value={form.governorate} onChange={(e) => set("governorate", e.target.value)}>
                    <option value="">Select…</option>
                    {EGYPT_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              {user && (
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#9a9a9a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <input type="checkbox" checked={savePrefs} onChange={(e) => setSavePrefs(e.target.checked)} />
                  Save this information for next time
                </label>
              )}
            </Section>

            <Section title="Payment">
              <div className="space-y-2">
                {(["cod", "instapay"] as PayMethod[]).map((pm) => {
                  const sel = payment === pm;
                  return (
                    <button
                      key={pm} type="button" onClick={() => setPayment(pm)}
                      style={{
                        width: "100%", textAlign: "left", padding: "14px 16px",
                        background: sel ? "#fff" : "transparent",
                        color: sel ? "#000" : "#fff",
                        border: `1px solid ${sel ? "#fff" : "#262626"}`,
                        fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {pm === "cod" ? "Cash on Delivery" : "InstaPay"}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#9a9a9a", marginTop: 8 }}>
                {payment === "instapay"
                  ? "Send the InstaPay transfer to: 01061024345"
                  : "You will pay when your order arrives."}
              </div>
            </Section>

            {error && (
              <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff" }}>
                {error}
              </div>
            )}
          </div>

          <aside className="self-start p-6 md:p-7" style={{ background: "#0a0a0a", border: "1px solid #262626" }}>
            <div className="jb-eyebrow">Order summary</div>
            <div className="mt-4 space-y-4">
              {items.map((it) => (
                <div key={`${it.id}-${it.selectedSize}-${it.selectedColor}`} className="flex gap-3">
                  <div style={{ width: 64, aspectRatio: "3/4", background: "#141414", flexShrink: 0 }}>
                    {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1" style={{ fontSize: 13 }}>
                    <div style={{ color: "#fff" }}>{it.name}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a9a9a", marginTop: 2 }}>
                      {[it.selectedColor, it.selectedSize].filter(Boolean).join(" · ")}
                    </div>
                    <div className="flex items-center gap-3 mt-2" style={{ fontSize: 12, color: "#9a9a9a" }}>
                      <input
                        type="number" min={1} max={it.stock_quantity} value={it.quantity}
                        onChange={(e) => updateQty(it.id, it.selectedSize, it.selectedColor, Number(e.target.value) || 1)}
                        className="jb-input" style={{ width: 56, padding: "4px 6px", fontSize: 12 }}
                      />
                      <button type="button" onClick={() => removeItem(it.id, it.selectedSize, it.selectedColor)}
                        style={{ background: "transparent", border: "none", color: "#9a9a9a", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "underline" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#fff" }}>{formatPrice(it.price_egp * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "#262626", margin: "20px 0" }} />

            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value="Calculated later" />
            {discount > 0 && offer && (
              <Row label={`Discount (${offer.discount_type === "percentage" ? `${offer.discount_value}%` : "offer"})`} value={`− ${formatPrice(discount)}`} highlight />
            )}
            <div style={{ height: 1, background: "#262626", margin: "12px 0" }} />
            <div className="flex justify-between" style={{ fontSize: 16, color: "#fff", paddingTop: 4 }}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a9a9a", marginTop: 12 }}>
              {payment === "instapay" ? "Cash on Delivery via InstaPay" : "Cash on Delivery"}
            </div>

            <button type="submit" disabled={submitting} className="jb-btn w-full mt-6">
              {submitting ? "Placing order…" : "Place order"}
            </button>

            <div style={{ fontSize: 11, color: "#9a9a9a", marginTop: 12, lineHeight: 1.5 }}>
              Questions? <a href={`mailto:${JABAL_SUPPORT_EMAIL}`} style={{ color: "#fff" }} className="hover:underline">{JABAL_SUPPORT_EMAIL}</a>
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3" style={{ border: "1px solid #262626", padding: 20 }}>
      <h2 style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fff", fontWeight: 500, marginBottom: 6 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, v, on, type = "text", textarea, required }: { label: string; v: string; on: (v: string) => void; type?: string; textarea?: boolean; required?: boolean }) {
  return (
    <div>
      <label className="jb-label">{label}</label>
      {textarea
        ? <textarea className="jb-textarea" rows={3} value={v} onChange={(e) => on(e.target.value)} required={required} />
        : <input type={type} className="jb-input" value={v} onChange={(e) => on(e.target.value)} required={required} />}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 13, color: highlight ? "#fff" : "#9a9a9a", padding: "4px 0" }}>
      <span>{label}</span>
      <span style={{ color: "#fff" }}>{value}</span>
    </div>
  );
}
