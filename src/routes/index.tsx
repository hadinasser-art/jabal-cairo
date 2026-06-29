import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchFeaturedItems, fetchItemsByGender } from "@/lib/items";
import type { Item } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JABAL" },
      { name: "description", content: "Premium minimal fashion." },
    ],
  }),
  component: Index,
});

function Index() {
  const [featured, setFeatured] = useState<Item[] | null>(null);
  const [men, setMen] = useState<Item[] | null>(null);
  const [women, setWomen] = useState<Item[] | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetchFeaturedItems(4).then(setFeatured);
    fetchItemsByGender("mens").then((r) => setMen(r.slice(0, 4)));
    fetchItemsByGender("womens").then((r) => setWomen(r.slice(0, 4)));
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="px-6 md:px-12 pt-12 md:pt-20 pb-12 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.08, color: "#fff" }}>
              {t("home.title")}
            </h1>
            <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: "#9a9a9a", maxWidth: 420 }}>
              {t("home.sub")}
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link to="/men" className="jb-btn">{t("nav.shopmen")}</Link>
              <Link to="/women" className="jb-btn-ghost">{t("nav.shopwomen")}</Link>
            </div>
            <div className="mt-12">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="jb-eyebrow">{t("home.featured.eyebrow")}</div>
                  <h2 style={{ fontSize: "clamp(1.25rem, 2.4vw, 1.75rem)", fontWeight: 300, marginTop: 6, color: "#fff" }}>
                    {t("home.featured.title")}
                  </h2>
                </div>
                <Link to="/shop" className="jb-link hidden sm:inline-block">{t("section.viewall")}</Link>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                {featured === null
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="aspect-[3/4] w-full" />
                        <Skeleton className="h-3 w-2/3 mt-3" />
                        <Skeleton className="h-3 w-1/4 mt-2" />
                      </div>
                    ))
                  : featured.length === 0
                  ? <div style={{ gridColumn: "1/-1", color: "#9a9a9a", fontSize: 13 }}>{t("section.empty")}</div>
                  : featured.map((it) => <ProductCard key={it.id} item={it} />)}
              </div>
              <div className="mt-6 sm:hidden">
                <Link to="/shop" className="jb-link">{t("section.viewall")}</Link>
              </div>
            </div>
          </div>
          <div style={{ background: "#0a0a0a", aspectRatio: "4/5", border: "1px solid #262626" }} />
        </div>
      </section>

      <Section title={t("men.eyebrow")} heading={t("home.men")} to="/men" items={men} />
      <Section title={t("women.eyebrow")} heading={t("home.women")} to="/women" items={women} />
    </Layout>
  );
}

function Section({ title, heading, to, items }: { title: string; heading: string; to: "/men" | "/women"; items: Item[] | null }) {
  const { t } = useI18n();
  return (
    <section className="px-6 md:px-12 py-10 md:py-16 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="jb-eyebrow">{title}</div>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 300, letterSpacing: "-0.01em", marginTop: 6, color: "#fff" }}>
            {heading}
          </h2>
        </div>
        <Link to={to} className="jb-link hidden md:inline-block">{t("section.viewall")}</Link>
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
          ? <div style={{ gridColumn: "1/-1", color: "#9a9a9a", fontSize: 13 }}>{t("section.empty")}</div>
          : items.map((it) => <ProductCard key={it.id} item={it} />)}
      </div>
      <div className="mt-8 md:hidden text-center">
        <Link to={to} className="jb-link">{t("section.viewall")}</Link>
      </div>
    </section>
  );
}
