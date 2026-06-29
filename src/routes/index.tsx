import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchItemsByGender } from "@/lib/items";
import type { Item } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JABAL — Cairo" },
      { name: "description", content: "Premium minimal fashion from Cairo." },
    ],
  }),
  component: Index,
});

function Index() {
  const [men, setMen] = useState<Item[] | null>(null);
  const [women, setWomen] = useState<Item[] | null>(null);

  useEffect(() => {
    fetchItemsByGender("mens").then((r) => setMen(r.slice(0, 4)));
    fetchItemsByGender("womens").then((r) => setWomen(r.slice(0, 4)));
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="px-6 md:px-12 pt-12 md:pt-20 pb-12 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="jb-eyebrow">New season · Cairo</div>
            <h1 style={{ marginTop: 16, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.08, color: "#fff" }}>
              Effortless every day.
            </h1>
            <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: "#9a9a9a", maxWidth: 420 }}>
              Considered essentials. Made for the modern wardrobe.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link to="/men" className="jb-btn">Shop Men</Link>
              <Link to="/women" className="jb-btn-ghost">Shop Women</Link>
            </div>
          </div>
          <div style={{ background: "#0a0a0a", aspectRatio: "4/5", border: "1px solid #262626" }} />
        </div>
      </section>

      <Section title="Men" to="/men" items={men} />
      <Section title="Women" to="/women" items={women} />
    </Layout>
  );
}

function Section({ title, to, items }: { title: string; to: "/men" | "/women"; items: Item[] | null }) {
  return (
    <section className="px-6 md:px-12 py-10 md:py-16 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="jb-eyebrow">{title}</div>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 300, letterSpacing: "-0.01em", marginTop: 6, color: "#fff" }}>
            {title === "Men" ? "Men's collection" : "Women's collection"}
          </h2>
        </div>
        <Link to={to} className="jb-link hidden md:inline-block">View all</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
        {items === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-3 w-2/3 mt-3" />
                <Skeleton className="h-3 w-1/4 mt-2" />
              </div>
            ))
          : items.length === 0
          ? <div style={{ gridColumn: "1/-1", color: "#9a9a9a", fontSize: 13 }}>No products yet.</div>
          : items.map((it) => <ProductCard key={it.id} item={it} />)}
      </div>
      <div className="mt-8 md:hidden text-center">
        <Link to={to} className="jb-link">View all</Link>
      </div>
    </section>
  );
}
