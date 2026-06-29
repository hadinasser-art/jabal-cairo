import { useEffect, useState } from "react";
import { Layout, Skeleton } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchItemsByGender } from "@/lib/items";
import type { Gender, Item } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export function CollectionPage({ gender, titleKey, eyebrowKey }: { gender: Gender; titleKey: string; eyebrowKey: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const { t } = useI18n();
  useEffect(() => { fetchItemsByGender(gender).then(setItems); }, [gender]);

  return (
    <Layout>
      <section className="px-6 md:px-12 pt-12 md:pt-16 pb-8 max-w-7xl mx-auto w-full">
        <div className="jb-eyebrow">{t(eyebrowKey)}</div>
        <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 300, letterSpacing: "-0.01em", marginTop: 8, color: "#fff" }}>
          {t(titleKey)}
          {items && (
            <span style={{ color: "#9a9a9a", fontSize: 14, marginLeft: 12, letterSpacing: 0 }}>({items.length})</span>
          )}
        </h1>
      </section>
      <section className="px-6 md:px-12 pb-16 max-w-7xl mx-auto w-full">
        {items === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-3 w-2/3 mt-3" />
                <Skeleton className="h-3 w-1/4 mt-2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center" style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a9a9a", padding: "80px 0" }}>
            {t("section.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
            {items.map((it) => <ProductCard key={it.id} item={it} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}
