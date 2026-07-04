import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Layout, Skeleton } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchFeaturedItems } from "@/lib/items";
import type { Item } from "@/lib/supabase";

export const Route = createFileRoute("/featured")({
  head: () => ({
    meta: [
      { title: "Featured Essentials — JABAL Wear" },
      {
        name: "description",
        content: "Shop featured JABAL Wear essentials for premium everyday style.",
      },
    ],
    links: [{ rel: "canonical", href: "https://jabalwear.com/featured" }],
  }),
  component: Featured,
});

function Featured() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetchFeaturedItems(8).then(setItems);
  }, []);

  return (
    <Layout>
      <section className="px-6 md:px-12 pt-12 md:pt-20 pb-12 max-w-7xl mx-auto w-full">
        <div className="jb-eyebrow">Featured</div>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.08,
            color: "#fff",
            marginTop: 10,
          }}
        >
          Featured essentials
        </h1>
        <p
          style={{
            marginTop: 20,
            fontSize: 14,
            lineHeight: 1.7,
            color: "#9a9a9a",
            maxWidth: 520,
          }}
        >
          Premium everyday clothing, clean silhouettes, and modern essentials made for your
          wardrobe.
        </p>
      </section>

      <section className="px-6 md:px-12 pb-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {items === null ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-3 w-2/3 mt-3" />
                <Skeleton className="h-3 w-1/4 mt-2" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div style={{ gridColumn: "1/-1", color: "#9a9a9a", fontSize: 13 }}>
              No featured products yet.
            </div>
          ) : (
            items.map((item) => <ProductCard key={item.display_key || item.id} item={item} />)
          )}
        </div>
      </section>
    </Layout>
  );
}
