import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item, formatPrice } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JABAL — Effortless every day" },
      { name: "description", content: "Premium everyday essentials from Cairo. New season now in." },
      { property: "og:title", content: "JABAL — Effortless every day" },
      { property: "og:description", content: "Premium everyday essentials from Cairo." },
    ],
  }),
  component: Index,
});

function Index() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setItems(data as Item[]);
      });
  }, []);

  return (
    <Layout>
      {/* HERO — editorial split */}
      <section className="grid md:grid-cols-2" style={{ background: "var(--jb-bg-warm)" }}>
        <div className="flex items-center px-6 md:px-16 py-20 md:py-32">
          <div className="max-w-md">
            <div className="jb-eyebrow">New season — Cairo</div>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                marginTop: 24,
                color: "var(--jb-ink)",
              }}
            >
              Effortless every day.
            </h1>
            <p
              style={{
                marginTop: 20,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--jb-muted)",
                maxWidth: 380,
              }}
            >
              Considered essentials, made for movement and stillness alike.
              A quiet wardrobe, built in Cairo.
            </p>
            <div className="flex flex-wrap gap-3 mt-10">
              <Link to="/shop" className="jb-btn">Shop collection</Link>
              <Link to="/shop" className="jb-btn-ghost">New in</Link>
            </div>
          </div>
        </div>
        <div
          className="hidden md:block relative"
          style={{
            background: "var(--jb-product-bg)",
            minHeight: "70vh",
          }}
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "clamp(4rem, 10vw, 9rem)",
              letterSpacing: "0.05em",
              color: "rgba(17,17,17,0.06)",
              fontWeight: 500,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            JABAL
          </div>
        </div>
      </section>

      {/* New in */}
      <section className="px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="jb-eyebrow">New in</div>
            <h2
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginTop: 8,
              }}
            >
              This week's arrivals
            </h2>
          </div>
          <Link to="/shop" className="jb-link hidden md:inline-block">View all</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {ARRIVALS.map((p) => (
            <StaticProductCard key={p.name} product={p} />
          ))}
        </div>

        <div className="mt-10 md:hidden text-center">
          <Link to="/shop" className="jb-link">View all</Link>
        </div>

      </section>

      {/* Two-panel editorial strip */}
      <section className="grid md:grid-cols-2" style={{ background: "#111", color: "#fff" }}>
        <EditorialPanel eyebrow="The basics" title="Considered everyday tees, cut and sewn in soft cotton." cta="Shop tees" />
        <EditorialPanel eyebrow="Outerwear" title="Layered pieces for shifting Cairo evenings." cta="Shop hoodies" border />
      </section>

      {/* More featured */}
      {items && items.length > 4 && (
        <section className="px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full">
          <div className="jb-eyebrow mb-6">Featured</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {items.slice(4, 8).map((it) => (
              <ProductCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

function EditorialPanel({
  eyebrow, title, cta, border,
}: { eyebrow: string; title: string; cta: string; border?: boolean }) {
  return (
    <Link
      to="/shop"
      className="block px-8 md:px-16 py-20 md:py-28"
      style={{
        borderLeft: border ? "1px solid rgba(255,255,255,0.1)" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          marginTop: 16,
          maxWidth: 380,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          marginTop: 28,
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          textDecoration: "underline",
          textUnderlineOffset: 6,
        }}
      >
        {cta}
      </div>
    </Link>
  );
}

export function ProductCard({ item }: { item: Item }) {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.sold_out) return;
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
    });
  };

  const swatches = (item.color || []).slice(0, 4);

  return (
    <Link to="/product/$id" params={{ id: item.id }} className="pc group">
      <div className="pc-img-wrap">
        <div style={{ width: "100%", height: "100%", background: "var(--jb-product-bg)" }} />

        {item.sold_out ? (
          <div className="pc-soldout">Sold out</div>
        ) : (
          <button type="button" className="pc-quickadd" onClick={quickAdd}>
            Quick add
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
