import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item, formatPrice } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JABAL — Built for Cairo's Elite" },
      { name: "description", content: "Premium activewear from Cairo. No compromises." },
      { property: "og:title", content: "JABAL — Built for Cairo's Elite" },
      { property: "og:description", content: "Premium activewear from Cairo." },
      {
        property: "og:image",
        content: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=90",
      },
    ],
  }),
  component: Index,
});

const HERO_IMG = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=90";

function Index() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setItems(data as Item[]);
      });
  }, []);

  return (
    <Layout>
      {/* HERO */}
      <section
        className="relative w-full flex items-center justify-center text-white"
        style={{
          height: "90vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="px-6 md:px-12 max-w-6xl w-full">
          <h1
            className="font-black uppercase text-white"
            style={{
              fontSize: "clamp(3rem, 8vw, 7rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              whiteSpace: "pre-line",
            }}
          >
            {"BUILT FOR\nCAIRO'S\nELITE."}
          </h1>
          <p className="mt-6 text-base md:text-lg uppercase tracking-[0.15em] font-medium">
            Premium activewear. No compromises.
          </p>
          <Link to="/shop" className="jabal-btn mt-10 bg-white !text-black hover:!bg-black hover:!text-white" style={{ background: "#fff", color: "#000" }}>
            Shop Now
          </Link>
        </div>
      </section>

      {/* FEATURED */}
      <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto w-full">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-[-0.03em] mb-10">Featured</h2>
        {err && <ErrorBanner />}
        {!items && !err && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4 mt-3" />
                <Skeleton className="h-4 w-1/3 mt-2" />
              </div>
            ))}
          </div>
        )}
        {items && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {items.map((it) => (
              <ProductCard key={it.id} item={it} />
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <Link to="/shop" className="jabal-btn-outline">View All</Link>
        </div>
      </section>
    </Layout>
  );
}

export function ProductCard({ item }: { item: Item }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: item.id }}
      className="product-card"
    >
      <div className="product-card-img-wrap relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="product-card-img" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-black/5" />
        )}
        {item.sold_out && (
          <div className="soldout-overlay">
            <span className="jabal-tag">Sold Out</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {item.category && (
          <div className="text-[0.65rem] uppercase tracking-[0.15em] font-bold opacity-60">
            {item.category}
          </div>
        )}
        <div className="mt-1 font-bold uppercase tracking-[-0.01em] text-sm md:text-base">
          {item.name}
        </div>
        <div className="mt-1 text-sm font-medium">{formatPrice(item.price_egp)}</div>
      </div>
    </Link>
  );
}
