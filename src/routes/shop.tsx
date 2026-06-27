import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item } from "@/lib/supabase";
import { ProductCard } from "./index";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — JABAL" },
      { name: "description", content: "Shop all JABAL premium activewear." },
      { property: "og:title", content: "Shop — JABAL" },
      { property: "og:description", content: "Shop all JABAL premium activewear." },
    ],
  }),
  component: ShopPage,
});

const FILTERS = ["ALL", "TOPS", "BOTTOMS", "OUTERWEAR", "ACCESSORIES"] as const;

function ShopPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setItems(data as Item[]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === "ALL") return items;
    return items.filter((i) => (i.category || "").toUpperCase() === filter);
  }, [items, filter]);

  return (
    <Layout>
      <section className="px-6 md:px-12 py-12 md:py-16 max-w-7xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-[-0.03em]">All Products</h1>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="shrink-0 text-[0.75rem] uppercase tracking-[0.15em] font-bold px-5 py-3"
                style={{
                  background: active ? "#000" : "#fff",
                  color: active ? "#fff" : "#000",
                  border: "1.5px solid #000",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {err && <div className="mt-8"><ErrorBanner /></div>}

        {!filtered && !err && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4 mt-3" />
                <Skeleton className="h-4 w-1/3 mt-2" />
              </div>
            ))}
          </div>
        )}

        {filtered && filtered.length === 0 && (
          <div className="mt-16 text-center uppercase tracking-[0.15em] text-sm font-bold opacity-60">
            No products in this category.
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-10">
            {filtered.map((it) => (
              <ProductCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
