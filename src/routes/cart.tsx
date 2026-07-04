import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useCart, type CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import {
  supabase,
  formatPrice,
  EGYPT_GOVERNORATES,
  governorateLabel,
  JABAL_SUPPORT_EMAIL,
} from "@/lib/supabase";
import { loadProfile, upsertProfile } from "@/lib/profile";
import { recordMarketingConsent } from "@/lib/marketing";
import { AppliedOfferLine, OfferCountdown } from "@/components/OfferCountdown";
import {
  calculateOfferTotals,
  fetchOffers,
  findMatchingCodeOffer,
  getFirstOrderEligible,
  getOfferCopy,
  type Offer,
} from "@/lib/offer";
import { useI18n } from "@/lib/i18n";

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

type PlaceOrderItem = {
  item_id: string;
  variant_id: string | null;
  item_name: string;
  quantity: number;
  total_price_egp: number;
  selected_size: string | null;
  selected_color: string | null;
};

const empty: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  full_address: "",
  city: "",
  governorate: "",
};

type Translate = (key: string) => string;

async function validateCartStock(items: CartItem[], t: Translate) {
  const variantIds = items.map((item) => item.variantId).filter(Boolean) as string[];
  const itemIds = items.filter((item) => !item.variantId).map((item) => item.id);

  const [variantResult, itemResult] = await Promise.all([
    variantIds.length
      ? supabase.from("product_variants").select("id,stock_quantity").in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase.from("items").select("id,stock_quantity,sold_out").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (variantResult.error || itemResult.error) return null;

  const variantStock = new Map(
    ((variantResult.data as { id: string; stock_quantity: number }[]) || []).map((row) => [
      row.id,
      row.stock_quantity,
    ]),
  );
  const itemStock = new Map(
    ((itemResult.data as { id: string; stock_quantity: number; sold_out: boolean }[]) || []).map(
      (row) => [row.id, row.sold_out ? 0 : row.stock_quantity],
    ),
  );

  for (const item of items) {
    const available = item.variantId ? variantStock.get(item.variantId) : itemStock.get(item.id);
    if (available === undefined) continue;
    if (available <= 0) return `${item.name} ${t("cart.stockUnavailable")}`;
    if (item.quantity > available) {
      return `${item.name} ${t("cart.stockOnly")} ${available} ${t("cart.stockUnits")}`;
    }
  }

  return null;
}

function friendlyOrderError(message: string, t: Translate) {
  const lower = message.toLowerCase();
  if (
    lower.includes("stock") ||
    lower.includes("sold out") ||
    lower.includes("not enough") ||
    lower.includes("available")
  ) {
    return t("cart.stockChanged");
  }
  if (lower.includes("offer") || lower.includes("promo")) return message;
  return t("cart.orderFailed");
}

function CartPage() {
  const { items, removeItem, updateQty, subtotal, clear } = useCart();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [savePrefs, setSavePrefs] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [payment, setPayment] = useState<PayMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [firstOrderEligible, setFirstOrderEligible] = useState(true);
  const [promoInput, setPromoInput] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

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
      } else {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
      }
    });
  }, [user]);

  useEffect(() => {
    fetchOffers().then(setOffers);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getFirstOrderEligible(user).then((eligible) => {
      if (!cancelled) setFirstOrderEligible(eligible);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const baseShippingFee = 0;
  const offerTotals = useMemo(
    () =>
      calculateOfferTotals(
        offers,
        subtotal,
        baseShippingFee,
        { user, firstOrderEligible, enteredCode },
        now,
      ),
    [offers, subtotal, baseShippingFee, user, firstOrderEligible, enteredCode, now],
  );
  const discount = offerTotals.discountTotal;
  const shippingFee = offerTotals.shippingFee;
  const total = offerTotals.total;
  const appliedOffers = offerTotals.appliedOffers;
  const hasFreeShippingOffer = appliedOffers.some((applied) => applied.freeShipping);

  const applyPromoCode = () => {
    const code = promoInput.trim();
    setPromoError(null);
    if (!code) {
      setEnteredCode("");
      return;
    }

    const matchingOffer = findMatchingCodeOffer(offers, code, now);
    if (!matchingOffer) {
      setPromoError(t("cart.promo.inactive"));
      return;
    }

    const totalsWithCode = calculateOfferTotals(
      offers,
      subtotal,
      baseShippingFee,
      { user, firstOrderEligible, enteredCode: code },
      now,
    );
    const applied = totalsWithCode.appliedOffers.some(
      (appliedOffer) => appliedOffer.offer.id === matchingOffer.id,
    );
    if (!applied) {
      setPromoError(t("cart.promo.invalid"));
      return;
    }

    setEnteredCode(code);
    setPromoError(null);
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="px-6 md:px-12 py-32 text-center max-w-2xl mx-auto">
          <div className="jb-eyebrow">{t("cart.empty.eyebrow")}</div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 300,
              marginTop: 12,
              color: "#fff",
            }}
          >
            {t("cart.empty.title")}
          </h1>
          <p style={{ marginTop: 16, color: "#9a9a9a", fontSize: 14 }}>{t("cart.empty.sub")}</p>
          <div className="mt-10">
            <Link to="/shop" className="jb-btn">
              {t("cart.empty.cta")}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const required: (keyof FormState)[] = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "full_address",
      "city",
      "governorate",
    ];
    for (const k of required) {
      if (!form[k].trim()) {
        setError(t("form.error.fields"));
        return;
      }
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
      const stockError = await validateCartStock(items, t);
      if (stockError) {
        setError(stockError);
        return;
      }

      const latestOffers = await fetchOffers();
      const latestFirstOrderEligible = await getFirstOrderEligible(user);
      const submittedTotals = calculateOfferTotals(
        latestOffers,
        subtotal,
        baseShippingFee,
        { user, firstOrderEligible: latestFirstOrderEligible, enteredCode },
        Date.now(),
      );
      const submittedAppliedOffers = submittedTotals.appliedOffers;
      setOffers(latestOffers);
      setFirstOrderEligible(latestFirstOrderEligible);

      const customerName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const shippingAddress = `${form.full_address.trim()}, ${form.city.trim()}, ${form.governorate.trim()}`;
      const totalItems = items.reduce((s, it) => s + it.quantity, 0);
      const orderSummary = items
        .map((it) => {
          const meta = [it.selectedColor, it.selectedSize].filter(Boolean).join(", ");
          return `${it.name} x${it.quantity}${meta ? ", " + meta : ""}`;
        })
        .join(" | ");

      const orderItems: PlaceOrderItem[] = items.map((it) => ({
        item_id: it.id,
        variant_id: it.variantId ?? null,
        item_name: it.name,
        quantity: it.quantity,
        total_price_egp: it.price_egp * it.quantity,
        selected_size: it.selectedSize,
        selected_color: it.selectedColor,
      }));

      const orderPayload = {
        customer_name: customerName,
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        shipping_address: shippingAddress,
        order_summary: orderSummary,
        total_items: totalItems,
        subtotal_egp: subtotal,
        shipping_fee_egp: submittedTotals.shippingFee,
        discount_egp: submittedTotals.discountTotal,
        total_price_egp: submittedTotals.total,
        payment_method: payment,
        payment_status: payment === "instapay" ? "pending" : "cod_pending",
        order_status: payment === "instapay" ? "new" : "confirmed",
        user_id: user?.id ?? null,
        offer_id: submittedAppliedOffers[0]?.offer.id ?? null,
        discount_amount_egp: submittedTotals.discountTotal,
        applied_offer_ids: submittedAppliedOffers.map((applied) => applied.offer.id),
        promo_code: enteredCode || null,
        items: orderItems,
      };

      const { data: orderIdData, error: placeOrderError } = await supabase.rpc("place_order", {
        p_order: orderPayload,
      });
      if (placeOrderError) throw new Error(friendlyOrderError(placeOrderError.message, t));
      const orderId = orderIdData as string;

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

      if (marketingOptIn) {
        await recordMarketingConsent({
          email: form.email.trim(),
          userId: user?.id ?? null,
          source: "checkout",
        });
      }

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
              image_url: it.image_url,
            })),
            subtotal,
            discount: submittedTotals.discountTotal,
            discounts: submittedAppliedOffers.map((applied) => ({
              title: getOfferCopy(applied.offer, lang).title,
              amount: applied.savedEgp,
            })),
            shipping_fee: submittedTotals.shippingFee,
            total: submittedTotals.total,
            payment_method: payment,
            payment_status: payment === "instapay" ? "pending" : "cod_pending",
            order_status: payment === "instapay" ? "new" : "confirmed",
          }),
        );
      } catch {
        // Ignore storage access issues in private browsing modes.
      }

      clear();
      navigate({ to: "/confirmation", search: { order_id: orderId } as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cart.orderFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const set = <K extends keyof FormState>(k: K, v: string) => setForm({ ...form, [k]: v });

  return (
    <Layout>
      <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto w-full">
        <div className="jb-eyebrow">{t("cart.eyebrow")}</div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
            fontWeight: 300,
            marginTop: 6,
            marginBottom: 32,
            color: "#fff",
          }}
        >
          {t("cart.title")}
        </h1>

        {!user && (
          <div
            className="mb-8"
            style={{ border: "1px solid #262626", padding: 16, fontSize: 13, color: "#9a9a9a" }}
          >
            <Link to="/login" className="hover:underline" style={{ color: "#fff" }}>
              {t("nav.login")}
            </Link>{" "}
            {t("cart.login.note")}
          </div>
        )}

        <form onSubmit={submit} className="grid xl:grid-cols-[minmax(0,1fr)_400px] gap-8 xl:gap-10">
          <div className="space-y-6">
            <Section title={t("cart.contact")}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label={t("form.first")}
                  placeholder={t("form.first.placeholder")}
                  v={form.first_name}
                  on={(v) => set("first_name", v)}
                  required
                />
                <Field
                  label={t("form.last")}
                  placeholder={t("form.last.placeholder")}
                  v={form.last_name}
                  on={(v) => set("last_name", v)}
                  required
                />
              </div>
              <Field
                label={t("form.email")}
                placeholder={t("form.email.placeholder")}
                type="email"
                v={form.email}
                on={(v) => set("email", v)}
                required
              />
              <Field
                label={t("form.phone")}
                placeholder={t("form.phone.placeholder")}
                v={form.phone}
                on={(v) => set("phone", v)}
                required
              />
              <label
                className="flex items-start gap-3"
                style={{ fontSize: 12, lineHeight: 1.6, color: "#9a9a9a" }}
              >
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>{t("marketing.optIn")}</span>
              </label>
            </Section>

            <Section title={t("cart.address")}>
              <Field
                label={t("form.fullAddress")}
                placeholder={t("form.fullAddress.placeholder")}
                v={form.full_address}
                on={(v) => set("full_address", v)}
                required
                textarea
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label={t("form.city")}
                  placeholder={t("form.city.placeholder")}
                  v={form.city}
                  on={(v) => set("city", v)}
                  required
                />
                <div>
                  <label className="jb-label">{t("form.governorate")}</label>
                  <select
                    className="jb-select"
                    required
                    value={form.governorate}
                    onChange={(e) => set("governorate", e.target.value)}
                  >
                    <option value="">{t("form.select")}</option>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {governorateLabel(g, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {user && (
                <label
                  className="flex items-center gap-2"
                  style={{
                    fontSize: 12,
                    color: "#9a9a9a",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={savePrefs}
                    onChange={(e) => setSavePrefs(e.target.checked)}
                  />
                  {t("form.save")}
                </label>
              )}
            </Section>

            <Section title={t("cart.payment")}>
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
                        textAlign: lang === "ar" ? "right" : "left",
                        padding: "14px 16px",
                        background: sel ? "#fff" : "transparent",
                        color: sel ? "#000" : "#fff",
                        border: `1px solid ${sel ? "#fff" : "#262626"}`,
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      {pm === "cod" ? t("pay.cod.full") : t("pay.instapay")}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#9a9a9a", marginTop: 8 }}>
                {payment === "instapay" ? t("pay.instapay.note") : t("pay.cod.note")}
              </div>
            </Section>

            {error && (
              <div
                style={{
                  border: "1px solid #fff",
                  padding: "10px 14px",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#fff",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <aside
            className="self-start p-4 sm:p-6 md:p-7 min-w-0"
            style={{ background: "#0a0a0a", border: "1px solid #262626" }}
          >
            <div className="jb-eyebrow">{t("cart.orderSummary")}</div>
            <div className="mt-4 space-y-4">
              {items.map((it) => (
                <div
                  key={`${it.id}-${it.variantId ?? ""}-${it.selectedSize}-${it.selectedColor}`}
                  className="flex gap-3 min-w-0"
                >
                  <div
                    style={{ width: 64, aspectRatio: "3/4", background: "#141414", flexShrink: 0 }}
                  >
                    {it.image_url && (
                      <img
                        src={it.image_url}
                        alt={it.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" style={{ fontSize: 13 }}>
                    <div style={{ color: "#fff" }}>{it.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#9a9a9a",
                        marginTop: 2,
                      }}
                    >
                      {[it.selectedColor, it.selectedSize].filter(Boolean).join(" · ")}
                    </div>
                    <div
                      className="flex items-center gap-3 mt-2 flex-wrap"
                      style={{ fontSize: 12, color: "#9a9a9a" }}
                    >
                      <input
                        type="number"
                        min={1}
                        max={it.stock_quantity}
                        value={it.quantity}
                        onChange={(e) =>
                          updateQty(
                            it.id,
                            it.selectedSize,
                            it.selectedColor,
                            Number(e.target.value) || 1,
                            it.variantId,
                          )
                        }
                        className="jb-input"
                        style={{ width: 56, padding: "4px 6px", fontSize: 12 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(it.id, it.selectedSize, it.selectedColor, it.variantId)
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9a9a9a",
                          cursor: "pointer",
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          textDecoration: "underline",
                        }}
                      >
                        {t("cart.remove")}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#fff", whiteSpace: "nowrap" }}>
                    {formatPrice(it.price_egp * it.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "#262626", margin: "20px 0" }} />

            <OfferCountdown
              offers={offers}
              label={t("cart.offerEnds")}
              onExpire={() => fetchOffers().then(setOffers)}
            />

            <div className="mt-5">
              <label className="jb-label">{t("cart.promo")}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="jb-input"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoError(null);
                  }}
                  placeholder={t("cart.promo.placeholder")}
                  style={{ textTransform: "uppercase" }}
                />
                <button
                  type="button"
                  className="jb-btn-ghost"
                  onClick={applyPromoCode}
                  style={{ minWidth: 92, padding: "12px 14px" }}
                >
                  {t("cart.apply")}
                </button>
              </div>
              {enteredCode && !promoError && (
                <button
                  type="button"
                  onClick={() => {
                    setEnteredCode("");
                    setPromoInput("");
                    setPromoError(null);
                  }}
                  className="jb-link mt-2"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#9a9a9a",
                  }}
                >
                  {t("cart.removeCode")}
                </button>
              )}
              {promoError && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#fff",
                    border: "1px solid #fff",
                    padding: "8px 10px",
                  }}
                >
                  {promoError}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: "#262626", margin: "20px 0" }} />

            <Row label={t("cart.subtotal")} value={formatPrice(subtotal)} />
            <Row
              label={t("cart.shipping")}
              value={hasFreeShippingOffer ? t("cart.free") : formatPrice(shippingFee)}
            />
            {appliedOffers.map((applied) => (
              <AppliedOfferLine
                key={applied.offer.id}
                title={getOfferCopy(applied.offer, lang).title}
                amount={applied.savedEgp}
              />
            ))}
            {discount > 0 && (
              <Row label={t("cart.savings")} value={`- ${formatPrice(discount)}`} highlight />
            )}
            <div style={{ height: 1, background: "#262626", margin: "12px 0" }} />
            <div
              className="flex justify-between"
              style={{ fontSize: 16, color: "#fff", paddingTop: 4 }}
            >
              <span>{t("cart.total")}</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#9a9a9a",
                marginTop: 12,
              }}
            >
              {payment === "instapay"
                ? `${t("pay.cod.full")} / ${t("pay.instapay")}`
                : t("pay.cod.full")}
            </div>

            <div
              className="mt-4 space-y-2"
              style={{ fontSize: 12, color: "#bdbdbd", lineHeight: 1.55 }}
            >
              <TrustLine>{t("cart.deliveryTrust")}</TrustLine>
              <TrustLine>{t("cart.returnTrust")}</TrustLine>
              <TrustLine>{t("cart.supportTrust")}</TrustLine>
            </div>

            <button type="submit" disabled={submitting} className="jb-btn w-full mt-6">
              {submitting ? t("form.placing") : t("form.place")}
            </button>

            <div style={{ fontSize: 11, color: "#9a9a9a", marginTop: 12, lineHeight: 1.5 }}>
              {t("cart.questions")}{" "}
              <a
                href={`mailto:${JABAL_SUPPORT_EMAIL}`}
                style={{ color: "#fff" }}
                className="hover:underline"
              >
                {JABAL_SUPPORT_EMAIL}
              </a>
            </div>
          </aside>
        </form>
      </div>
    </Layout>
  );
}

function TrustLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span aria-hidden="true" style={{ color: "#fff" }}>
        -
      </span>
      <span>{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="space-y-3"
      style={{ border: "1px solid #3a3a3a", background: "#050505", padding: 20 }}
    >
      <h2
        style={{
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#fff",
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  textarea,
  required,
  placeholder,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="jb-label">{label}</label>
      {textarea ? (
        <textarea
          className="jb-textarea"
          rows={3}
          value={v}
          onChange={(e) => on(e.target.value)}
          required={required}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className="jb-input"
          value={v}
          onChange={(e) => on(e.target.value)}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="flex justify-between gap-3"
      style={{ fontSize: 13, color: highlight ? "#fff" : "#9a9a9a", padding: "4px 0" }}
    >
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>
      <span style={{ color: "#fff", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
