import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { type Item, formatPrice } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JABAL — Cairo" },
      { name: "description", content: "Premium everyday essentials from Cairo." },
      { property: "og:title", content: "JABAL — Cairo" },
      { property: "og:description", content: "Premium everyday essentials from Cairo." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <Layout>
      {/* Men */}
      <section id="men" className="px-6 md:px-12 pt-16 md:pt-24 pb-12 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="jb-eyebrow">{t("men.eyebrow")}</div>
            <h2
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginTop: 8,
                color: "#fff",
              }}
            >
              {t("men.title")}
            </h2>
          </div>
          <Link to="/shop" className="jb-link hidden md:inline-block">{t("section.viewall")}</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {MEN.map((p) => (
            <StaticProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 md:hidden text-center">
          <Link to="/shop" className="jb-link">{t("section.viewall")}</Link>
        </div>
      </section>

      {/* Women */}
      <section id="women" className="px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full scroll-mt-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="jb-eyebrow">{t("women.eyebrow")}</div>
            <h2
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginTop: 8,
                color: "#fff",
              }}
            >
              {t("women.title")}
            </h2>
          </div>
          <Link to="/shop" className="jb-link hidden md:inline-block">{t("section.viewall")}</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {WOMEN.map((p) => (
            <StaticProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 md:hidden text-center">
          <Link to="/shop" className="jb-link">{t("section.viewall")}</Link>
        </div>
      </section>
    </Layout>
  );
}

export function ProductCard({ item }: { item: Item }) {
  const { addItem } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.sold_out || item.stock_quantity <= 0) return;
    const size = item.size?.[0] ?? null;
    const color = item.color?.[0] ?? null;
    addItem({
      id: item.id,
      name: item.name,
      price_egp: item.price_egp,
      image_url: item.image_url,
      selectedSize: size,
      selectedColor: color,
      quantity: 1,
      stock_quantity: item.stock_quantity,
    });
    notifyAddedToBag({
      name: item.name,
      size,
      color,
      onView: () => navigate({ to: "/cart" }),
      t,
    });
  };

  const swatches = (item.color || []).slice(0, 4);
  const soldOut = item.sold_out || item.stock_quantity <= 0;

  return (
    <Link to="/product/$id" params={{ id: item.id }} className="pc group">
      <div className="pc-img-wrap">
        <div style={{ width: "100%", height: "100%", background: "var(--jb-product-bg)" }} />

        {soldOut ? (
          <div className="pc-soldout">{t("card.soldout")}</div>
        ) : (
          <button type="button" className="pc-quickadd" onClick={quickAdd}>
            {t("card.quickadd")}
          </button>
        )}
      </div>

      <div className="mt-3">
        <div style={{ fontSize: 13, fontWeight: 400, color: "var(--jb-ink)" }}>{item.name}</div>
        <div style={{ fontSize: 13, color: "var(--jb-muted)", marginTop: 2 }}>
          {formatPrice(item.price_egp)}
        </div>
        {swatches.length > 0 && (
          <div className="flex gap-[6px] mt-2">
            {swatches.map((c) => (
              <span
                key={c}
                title={c}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: swatchColor(c),
                  border: "1px solid var(--jb-line)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function swatchColor(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    black: "#111", white: "#fff", grey: "#9a9a9a", gray: "#9a9a9a",
    beige: "#d8c9b0", cream: "#f1ead9", sand: "#cdb892",
    navy: "#1c2540", blue: "#3b5b8c", olive: "#6b6a3a",
    green: "#3d5a3f", brown: "#5a3f2c", red: "#7a2a23",
    pink: "#e6c4c4", yellow: "#d8c25a", purple: "#5a3f6b",
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  return "#cfcfcf";
}

type Arrival = { id: string; name: string; price: number; colors: string[]; stock: number };

const MEN: Arrival[] = [
  { id: "m-tee", name: "Essential Cotton T-Shirt", price: 650, colors: ["white", "black", "beige"], stock: 99 },
  { id: "m-shirt", name: "Relaxed Fit Shirt", price: 950, colors: ["white", "blue"], stock: 99 },
  { id: "m-jeans", name: "Straight Leg Jeans", price: 1250, colors: ["blue", "black"], stock: 99 },
  { id: "m-jacket", name: "Lightweight Casual Jacket", price: 1600, colors: ["beige", "black"], stock: 99 },
];

const WOMEN: Arrival[] = [
  { id: "w-top", name: "Basic Fitted Top", price: 550, colors: ["white", "black", "pink"], stock: 99 },
  { id: "w-shirt", name: "Oversized Cotton Shirt", price: 950, colors: ["white", "beige"], stock: 99 },
  { id: "w-jeans", name: "High Waist Jeans", price: 1300, colors: ["blue", "black"], stock: 99 },
  { id: "w-cardigan", name: "Soft Knit Cardigan", price: 1450, colors: ["cream", "grey"], stock: 99 },
];

function StaticProductCard({ product }: { product: Arrival }) {
  const { addItem } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();
  const soldOut = product.stock <= 0;

  const addToCart = () => {
    if (soldOut) return;
    const color = product.colors[0] ?? null;
    addItem({
      id: product.id,
      name: product.name,
      price_egp: product.price,
      image_url: null,
      selectedSize: null,
      selectedColor: color,
      quantity: 1,
      stock_quantity: product.stock,
    });
    notifyAddedToBag({
      name: product.name,
      size: null,
      color,
      onView: () => navigate({ to: "/cart" }),
      t,
    });
  };

  return (
    <div className="pc">
      <div className="pc-img-wrap" style={{ background: "#141414" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 16,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#666",
            fontWeight: 400,
          }}
        >
          {product.name}
        </div>
        {soldOut && <div className="pc-soldout">{t("card.soldout")}</div>}
      </div>
      <div className="mt-3">
        <div style={{ fontSize: 13, fontWeight: 400, color: "var(--jb-ink)" }}>{product.name}</div>
        <div style={{ fontSize: 13, color: "var(--jb-muted)", marginTop: 2 }}>
          {formatPrice(product.price)}
        </div>
        <div className="flex gap-[6px] mt-2">
          {product.colors.map((c) => (
            <span
              key={c}
              title={c}
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: swatchColor(c),
                border: "1px solid var(--jb-line)",
                display: "inline-block",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          style={{
            marginTop: 12,
            width: "100%",
            background: soldOut ? "#2a2a2a" : "#fff",
            color: soldOut ? "#888" : "#000",
            border: `1px solid ${soldOut ? "#2a2a2a" : "#fff"}`,
            padding: "10px 14px",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
            cursor: soldOut ? "not-allowed" : "pointer",
          }}
        >
          {soldOut ? t("card.soldout") : t("card.add")}
        </button>
      </div>
    </div>
  );
}
