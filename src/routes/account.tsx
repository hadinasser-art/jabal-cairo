import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { loadProfile, upsertProfile, type CustomerProfile } from "@/lib/profile";
import { supabase, formatPrice, EGYPT_GOVERNORATES, JABAL_SUPPORT_EMAIL, type Item } from "@/lib/supabase";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Account — JABAL" }] }),
  component: AccountPage,
});

type OrderRow = {
  order_id: string;
  created_at: string;
  total_price_egp: number;
  status: string;
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
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    loadProfile(user.id).then((p) => {
      setProfile(p ?? {
        user_id: user.id,
        first_name: null, last_name: null,
        email: user.email ?? null,
        phone: null, full_address: null, city: null, governorate: null,
      });
    });
    supabase.from("combined_orders").select("order_id,created_at,total_price_egp,status,order_summary")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) || []));
    supabase
      .from("favorites")
      .select("id,created_at,variant_id,item:items(id,name,description,price_egp,image_url,category,size,color,stock_quantity,sold_out,created_at,gender),variant:product_variants(id,color,size,stock_quantity,image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn("favorites", error.message);
        setFavorites((data as FavoriteRow[]) || []);
      });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) {
    return <Layout><div className="px-6 py-24" style={{ color: "#9a9a9a" }}>Loading…</div></Layout>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSavedMsg(null);
    await upsertProfile(profile);
    setSaving(false);
    setSavedMsg("Saved.");
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const set = <K extends keyof CustomerProfile>(k: K, v: CustomerProfile[K]) =>
    setProfile({ ...profile, [k]: v });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="jb-eyebrow">Account</div>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 300, marginTop: 6, color: "#fff" }}>
              {profile.first_name ? `Hello, ${profile.first_name}` : "My account"}
            </h1>
            <div style={{ color: "#9a9a9a", fontSize: 13, marginTop: 4 }}>{user.email}</div>
          </div>
          <button onClick={() => signOut().then(() => navigate({ to: "/" }))} className="jb-btn-ghost">Logout</button>
        </div>

        <section style={{ border: "1px solid #262626", padding: 22, marginBottom: 34 }}>
          <div className="flex items-end justify-between gap-4 flex-wrap" style={{ marginBottom: 18 }}>
            <div>
              <div className="jb-eyebrow">Saved</div>
              <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 400, marginTop: 6 }}>Favorites to buy later</h2>
            </div>
            <Link to="/shop" className="jb-link">Keep shopping</Link>
          </div>
          {favorites === null ? (
            <div style={{ color: "#9a9a9a", fontSize: 13 }}>Loading saved items…</div>
          ) : favorites.filter((fav) => fav.item).length === 0 ? (
            <div style={{ color: "#9a9a9a", fontSize: 13 }}>No favorites yet. Tap the heart on any product to save it here.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {favorites.map((fav) => fav.item && <FavoriteItem key={fav.id} favorite={fav} />)}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-10">
          <form onSubmit={save} className="space-y-4">
            <h2 style={{ fontSize: 16, color: "#fff", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" v={profile.first_name} on={(v) => set("first_name", v)} />
              <Field label="Last name" v={profile.last_name} on={(v) => set("last_name", v)} />
            </div>
            <Field label="Email" v={profile.email} on={(v) => set("email", v)} type="email" />
            <Field label="Phone" v={profile.phone} on={(v) => set("phone", v)} />
            <Field label="Full address" v={profile.full_address} on={(v) => set("full_address", v)} textarea />
            <Field label="City" v={profile.city} on={(v) => set("city", v)} />
            <div>
              <label className="jb-label">Governorate</label>
              <select className="jb-select" value={profile.governorate ?? ""} onChange={(e) => set("governorate", e.target.value || null)}>
                <option value="">Select…</option>
                {EGYPT_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {savedMsg && <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, color: "#fff" }}>{savedMsg}</div>}
            <button type="submit" disabled={saving} className="jb-btn">{saving ? "Saving…" : "Save changes"}</button>
          </form>

          <div>
            <h2 style={{ fontSize: 16, color: "#fff", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Orders</h2>
            {orders === null ? (
              <div style={{ color: "#9a9a9a", fontSize: 13 }}>Loading orders…</div>
            ) : orders.length === 0 ? (
              <div style={{ color: "#9a9a9a", fontSize: 13 }}>No orders yet. <Link to="/shop" className="jb-link">Start shopping</Link></div>
            ) : (
              <div style={{ border: "1px solid #262626" }}>
                {orders.map((o) => (
                  <div key={o.order_id} style={{ padding: 16, borderBottom: "1px solid #262626" }}>
                    <div className="flex justify-between" style={{ fontSize: 13, color: "#fff" }}>
                      <span style={{ letterSpacing: "0.05em" }}>{o.order_id}</span>
                      <span>{formatPrice(o.total_price_egp)}</span>
                    </div>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a", marginTop: 4 }}>
                      {new Date(o.created_at).toLocaleDateString()} · {o.status}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a9a9a", marginTop: 6, lineHeight: 1.5 }}>{o.order_summary}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 24, fontSize: 12, color: "#9a9a9a", letterSpacing: "0.1em" }}>
              Need help? <a href={`mailto:${JABAL_SUPPORT_EMAIL}`} className="hover:underline" style={{ color: "#fff" }}>{JABAL_SUPPORT_EMAIL}</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FavoriteItem({ favorite }: { favorite: FavoriteRow }) {
  if (!favorite.item) return null;
  const image = favorite.variant?.image_url || favorite.item.image_url;
  const variantText = favorite.variant ? `${favorite.variant.color} · ${favorite.variant.size}` : null;
  const available = favorite.variant ? favorite.variant.stock_quantity > 0 : !favorite.item.sold_out && favorite.item.stock_quantity > 0;

  return (
    <div className="pc group">
      <Link to="/product/$id" params={{ id: favorite.item.id }} style={{ display: "block" }}>
        <div className="pc-img-wrap">
          {image ? (
            <img src={image} alt={[favorite.item.name, variantText].filter(Boolean).join(" - ")} className="pc-img" loading="lazy" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#141414" }} />
          )}
          {!available && <div className="pc-soldout">Sold out</div>}
        </div>
        <div className="mt-3">
          <div style={{ fontSize: 13, color: "#fff" }}>{favorite.item.name}</div>
          {variantText && (
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a", marginTop: 4 }}>
              {variantText}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#9a9a9a", marginTop: 4 }}>{formatPrice(favorite.item.price_egp)}</div>
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

function Field({ label, v, on, type = "text", textarea }: { label: string; v: string | null; on: (v: string | null) => void; type?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="jb-label">{label}</label>
      {textarea ? (
        <textarea className="jb-textarea" rows={3} value={v ?? ""} onChange={(e) => on(e.target.value || null)} />
      ) : (
        <input type={type} className="jb-input" value={v ?? ""} onChange={(e) => on(e.target.value || null)} />
      )}
    </div>
  );
}
