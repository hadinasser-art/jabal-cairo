import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "./index";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — JABAL" },
      { name: "description", content: "Shop the latest JABAL collection. Considered essentials from Cairo." },
      { property: "og:title", content: "Shop — JABAL" },
      { property: "og:description", content: "Shop the latest JABAL collection." },
    ],
  }),
  component: ShopPage,
});

const FILTERS = [
  "All",
  "T-shirts",
  "Shirts",
  "Jeans",
  "Chinos",
  "Jackets",
  "Knitwear",
  "Hoodies",
  "Trousers",
] as const;


function ShopPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

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
    if (filter === "All") return items;
    return items.filter((i) => (i.category || "").toLowerCase() === filter.toLowerCase());
  }, [items, filter]);

  return (
    <Layout>
      <section className="px-6 md:px-12 pt-12 md:pt-16 pb-6 max-w-7xl mx-auto w-full">
        <div className="jb-eyebrow">{t("shop.eyebrow")}</div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            marginTop: 8,
            color: "#fff",
          }}
        >
          {t("shop.title")}
          {filtered && (
            <span style={{ color: "var(--jb-muted)", fontSize: 14, marginLeft: 12, letterSpacing: 0 }}>
              ({filtered.length})
            </span>
          )}
        </h1>
      </section>

      <section className="px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div
          className="flex gap-6 overflow-x-auto pb-4"
          style={{ borderBottom: "1px solid var(--jb-line)" }}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="shrink-0"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                  color: active ? "var(--jb-ink)" : "var(--jb-muted)",
                  paddingBottom: 6,
                  borderBottom: active ? "1px solid var(--jb-ink)" : "1px solid transparent",
                  background: "transparent",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {err && <div className="mt-8"><ErrorBanner /></div>}

        {!filtered && !err && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 mt-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-3 w-2/3 mt-3" />
                <Skeleton className="h-3 w-1/4 mt-2" />
              </div>
            ))}
          </div>
        )}

        {filtered && filtered.length === 0 && (
          <div
            className="mt-24 text-center"
            style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jb-muted)" }}
          >
            {t("shop.empty")}
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 mt-10">
            {filtered.map((it) => (
              <ProductCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
