import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { loadProfile, upsertProfile, type CustomerProfile } from "@/lib/profile";
import {
  supabase,
  formatPrice,
  EGYPT_GOVERNORATES,
  governorateLabel,
  JABAL_SUPPORT_EMAIL,
  type Item,
} from "@/lib/supabase";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — JABAL" }] }),
  component: AccountPage,
});

type OrderRow = {
  order_id: string;
  created_at: string;
  total_price_egp: number;
  payment_status: string;
  order_status: string;
  order_summary: string;
};

type FavoriteRow = {
  id: string;
  created_at: string;
  variant_id: string | null;
  item: Item | null;
  variant: {
    id: string;
    color: string;
    size: string;
    stock_quantity: number;
    image_url: string | null;
  } | null;
};

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadProfile(user.id).then(async (p) => {
      if (p) {
        setProfile(p);
        return;
      }

      const meta = (user.user_metadata || {}) as Record<string, string>;
      const full = meta.full_name || meta.name || "";
      const [first = "", ...rest] = full.split(" ");
      const nextProfile = {
        user_id: user.id,
        first_name: meta.first_name || meta.given_name || first || null,
        last_name: meta.last_name || meta.family_name || rest.join(" ") || null,
        email: user.email ?? null,
        phone: null,
        full_address: null,
        city: null,
        governorate: null,
      };

      setProfile(nextProfile);
      await upsertProfile(nextProfile);
    });
    supabase
      .from("combined_orders")
      .select("order_id,created_at,total_price_egp,payment_status,order_status,order_summary")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) || []));
    supabase
      .from("favorites")
      .select(
        "id,created_at,variant_id,item:items(id,name,description,price_egp,image_url,category,size,color,stock_quantity,sold_out,created_at,gender),variant:product_variants(id,color,size,stock_quantity,image_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn("favorites", error.message);
        setFavorites((data as FavoriteRow[]) || []);
      });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) {
    return (
      <Layout>
        <div className="px-6 py-24" style={{ color: "#9a9a9a" }}>
          {t("account.saved.loading")}
        </div>
      </Layout>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    await upsertProfile(profile);
    setSaving(false);
    setSavedMsg(t("account.savedMessage"));
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const set = <K extends keyof CustomerProfile>(k: K, v: CustomerProfile[K]) =>
    setProfile({ ...profile, [k]: v });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="jb-eyebrow">{t("account.eyebrow")}</div>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                fontWeight: 300,
                marginTop: 6,
                color: "#fff",
              }}
            >
              {profile.first_name
                ? `${t("account.hello")} ${profile.first_name}`
                : t("account.title")}
            </h1>
            <div style={{ color: "#9a9a9a", fontSize: 13, marginTop: 4 }}>{user.email}</div>
          </div>
          <button
            onClick={() => signOut().then(() => navigate({ to: "/" }))}
            className="jb-btn-ghost"
          >
            {t("nav.logout")}
          </button>
        </div>

        <section style={{ border: "1px solid #262626", padding: 22, marginBottom: 34 }}>
          <div
            className="flex items-end justify-between gap-4 flex-wrap"
            style={{ marginBottom: 18 }}
          >
            <div>
              <div className="jb-eyebrow">{t("account.saved.eyebrow")}</div>
              <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 400, marginTop: 6 }}>
                {t("account.saved.title")}
              </h2>
            </div>
            <Link to="/shop" className="jb-link">
              {t("account.keepShopping")}
            </Link>
          </div>
          {favorites === null ? (
            <div style={{ color: "#9a9a9a", fontSize: 13 }}>{t("account.saved.loading")}</div>
          ) : favorites.filter((fav) => fav.item).length === 0 ? (
            <div style={{ color: "#9a9a9a", fontSize: 13 }}>{t("account.saved.empty")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {favorites.map((fav) => fav.item && <FavoriteItem key={fav.id} favorite={fav} />)}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-10">
          <form onSubmit={save} className="space-y-4">
            <h2
              style={{
                fontSize: 16,
                color: "#fff",
                fontWeight: 400,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {t("account.profile")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label={t("form.first")}
                v={profile.first_name}
                on={(v) => set("first_name", v)}
              />
              <Field label={t("form.last")} v={profile.last_name} on={(v) => set("last_name", v)} />
            </div>
            <Field
              label={t("form.email")}
              v={profile.email}
              on={(v) => set("email", v)}
              type="email"
            />
            <Field label={t("form.phone")} v={profile.phone} on={(v) => set("phone", v)} />
            <Field
              label={t("form.fullAddress")}
              v={profile.full_address}
              on={(v) => set("full_address", v)}
              textarea
            />
            <Field label={t("form.city")} v={profile.city} on={(v) => set("city", v)} />
            <div>
              <label className="jb-label">{t("form.governorate")}</label>
              <select
                className="jb-select"
                value={profile.governorate ?? ""}
                onChange={(e) => set("governorate", e.target.value || null)}
              >
                <option value="">{t("form.select")}</option>
                {EGYPT_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {governorateLabel(g, lang)}
                  </option>
                ))}
              </select>
            </div>
            {savedMsg && (
              <div
                style={{
                  border: "1px solid #fff",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#fff",
                }}
              >
                {savedMsg}
              </div>
            )}
            <button type="submit" disabled={saving} className="jb-btn">
              {saving ? t("account.saving") : t("account.saveChanges")}
            </button>
          </form>

          <div>
            <h2
              style={{
                fontSize: 16,
                color: "#fff",
                fontWeight: 400,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              {t("account.orders")}
            </h2>
            {orders === null ? (
              <div style={{ color: "#9a9a9a", fontSize: 13 }}>{t("account.orders.loading")}</div>
            ) : orders.length === 0 ? (
              <div style={{ color: "#9a9a9a", fontSize: 13 }}>
                {t("account.orders.empty")}{" "}
                <Link to="/shop" className="jb-link">
                  {t("account.startShopping")}
                </Link>
              </div>
            ) : (
              <div style={{ border: "1px solid #262626" }}>
                {orders.map((o) => (
                  <div key={o.order_id} style={{ padding: 16, borderBottom: "1px solid #262626" }}>
                    <div
                      className="flex justify-between gap-3 flex-wrap"
                      style={{ fontSize: 13, color: "#fff" }}
                    >
                      <span style={{ letterSpacing: "0.05em", overflowWrap: "anywhere" }}>
                        {o.order_id}
                      </span>
                      <span style={{ whiteSpace: "nowrap" }}>{formatPrice(o.total_price_egp)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "#9a9a9a",
                        marginTop: 4,
                      }}
                    >
                      {new Date(o.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                      · {t("status.payment")} {statusLabel(o.payment_status)} · {t("status.order")}{" "}
                      {statusLabel(o.order_status)}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a9a9a", marginTop: 6, lineHeight: 1.5 }}>
                      {o.order_summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 24, fontSize: 12, color: "#9a9a9a", letterSpacing: "0.1em" }}>
              {t("account.needHelp")}{" "}
              <a
                href={`mailto:${JABAL_SUPPORT_EMAIL}`}
                className="hover:underline"
                style={{ color: "#fff" }}
              >
                {JABAL_SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function FavoriteItem({ favorite }: { favorite: FavoriteRow }) {
  const { t } = useI18n();
  if (!favorite.item) return null;
  const image = favorite.variant?.image_url || favorite.item.image_url;
  const variantText = favorite.variant
    ? `${favorite.variant.color} · ${favorite.variant.size}`
    : null;
  const available = favorite.variant
    ? favorite.variant.stock_quantity > 0
    : !favorite.item.sold_out && favorite.item.stock_quantity > 0;

  return (
    <div className="pc group">
      <Link to="/product/$id" params={{ id: favorite.item.id }} style={{ display: "block" }}>
        <div className="pc-img-wrap">
          {image ? (
            <img
              src={image}
              alt={[favorite.item.name, variantText].filter(Boolean).join(" - ")}
              className="pc-img"
              loading="lazy"
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#141414" }} />
          )}
          {!available && <div className="pc-soldout">{t("card.soldout")}</div>}
        </div>
        <div className="mt-3">
          <div style={{ fontSize: 13, color: "#fff" }}>{favorite.item.name}</div>
          {variantText && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#9a9a9a",
                marginTop: 4,
              }}
            >
              {variantText}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#9a9a9a", marginTop: 4 }}>
            {formatPrice(favorite.item.price_egp)}
          </div>
        </div>
      </Link>
      <FavoriteButton
        itemId={favorite.item.id}
        itemName={favorite.item.name}
        variantId={favorite.variant_id}
        className="pc-favorite"
      />
    </div>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
  textarea,
}: {
  label: string;
  v: string | null;
  on: (v: string | null) => void;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="jb-label">{label}</label>
      {textarea ? (
        <textarea
          className="jb-textarea"
          rows={3}
          value={v ?? ""}
          onChange={(e) => on(e.target.value || null)}
        />
      ) : (
        <input
          type={type}
          className="jb-input"
          value={v ?? ""}
          onChange={(e) => on(e.target.value || null)}
        />
      )}
    </div>
  );
}
