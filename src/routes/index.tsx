import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchFeaturedItems, fetchItemsByGender } from "@/lib/items";
import type { Item } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "JABAL" }, { name: "description", content: "Premium minimal fashion." }],
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
        <div>
          <div style={{ maxWidth: 620 }}>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3.25rem)",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                lineHeight: 1.08,
                color: "#fff",
              }}
            >
              {t("home.title")}
            </h1>
            <p
              style={{
                marginTop: 20,
                fontSize: 14,
                lineHeight: 1.7,
                color: "#9a9a9a",
                maxWidth: 420,
              }}
            >
              {t("home.sub")}
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link to="/men" className="jb-btn">
                {t("nav.shopmen")}
              </Link>
              <Link to="/women" className="jb-btn-ghost">
                {t("nav.shopwomen")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Section
        title={t("home.featured.eyebrow")}
        heading={t("home.featured.title")}
        to="/shop"
        items={featured}
      />
      <Section title={t("men.eyebrow")} heading={t("home.men")} to="/men" items={men} />
      <Section title={t("women.eyebrow")} heading={t("home.women")} to="/women" items={women} />
    </Layout>
  );
}

function Section({
  title,
  heading,
  to,
  items,
}: {
  title: string;
  heading: string;
  to: "/shop" | "/men" | "/women";
  items: Item[] | null;
}) {
  const { t } = useI18n();
  return (
    <section className="px-6 md:px-12 py-10 md:py-16 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="jb-eyebrow">{title}</div>
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              marginTop: 6,
              color: "#fff",
            }}
          >
            {heading}
          </h2>
        </div>
        <Link to={to} className="jb-link hidden md:inline-block">
          {t("section.viewall")}
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
        {items === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-3 w-2/3 mt-3" />
              <Skeleton className="h-3 w-1/4 mt-2" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ gridColumn: "1/-1", color: "#9a9a9a", fontSize: 13 }}>
            {t("section.empty")}
          </div>
        ) : (
          items.map((it) => <ProductCard key={it.id} item={it} />)
        )}
      </div>
      <div className="mt-8 md:hidden text-center">
        <Link to={to} className="jb-link">
          {t("section.viewall")}
        </Link>
      </div>
    </section>
  );
}
