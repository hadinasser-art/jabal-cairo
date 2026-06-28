import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item, formatPrice } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "./index";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useI18n();
  const [item, setItem] = useState<Item | null>(null);
  const [related, setRelated] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setItem(null);
    setErr(null);
    supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else {
          const it = data as Item | null;
          setItem(it);
          if (it) {
            setSize(it.size && it.size.length === 1 ? it.size[0] : null);
            setColor(it.color && it.color.length === 1 ? it.color[0] : null);
            if (it.category) {
              supabase
                .from("items")
                .select("*")
                .eq("category", it.category)
                .neq("id", it.id)
                .limit(4)
                .then(({ data: rel }) => setRelated((rel as Item[]) || []));
            }
          }
        }
      });
  }, [id]);

  if (err) return <Layout><div className="p-6"><ErrorBanner /></div></Layout>;

  if (!item)
    return (
      <Layout>
        <div className="grid md:grid-cols-2 gap-8 p-6 md:p-12 max-w-7xl mx-auto">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Layout>
    );

  const soldOut = item.sold_out || item.stock_quantity <= 0;

  const handleAdd = () => {
    setWarning(null);
    if (item.size && item.size.length > 0 && !size) {
      setWarning(t("pdp.selectsize"));
      return;
    }
    if (item.color && item.color.length > 0 && !color) {
      setWarning(t("pdp.selectcolor"));
      return;
    }
    addItem({
      id: item.id,
      name: item.name,
      price_egp: item.price_egp,
      image_url: item.image_url,
      selectedSize: size,
      selectedColor: color,
      quantity: qty,
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

  return (
    <Layout>
      <div
        className="px-6 md:px-12 pt-6 max-w-[1600px] mx-auto"
        style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jb-muted)" }}
      >
        <Link to="/" style={{ color: "var(--jb-muted)" }}>{t("nav.shop")}</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link to="/shop" style={{ color: "var(--jb-muted)" }}>{t("nav.shop")}</Link>
        {item.category && (
          <>
            <span style={{ margin: "0 8px" }}>/</span>
            <span>{item.category}</span>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-[60%_40%] gap-0 max-w-[1600px] mx-auto mt-6">
        <div style={{ background: "var(--jb-product-bg)" }} className="relative">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover aspect-[3/4] md:aspect-auto md:min-h-[80vh]"
            />
          ) : (
            <div className="aspect-[3/4]" style={{ background: "var(--jb-product-bg)" }} />
          )}
          {soldOut && (
            <div className="pc-soldout" style={{ fontSize: 13 }}>{t("card.soldout")}</div>
          )}
        </div>

        <div className="p-6 md:p-12 flex flex-col">
          {item.category && <div className="jb-eyebrow">{item.category}</div>}
          <h1
            style={{
              marginTop: 8,
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              color: "var(--jb-ink)",
            }}
          >
            {item.name}
          </h1>
          <div style={{ marginTop: 12, fontSize: 16, color: "var(--jb-ink)" }}>
            {formatPrice(item.price_egp)}
          </div>
          {item.description && (
            <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: "var(--jb-muted)" }}>
              {item.description}
            </p>
          )}

          <div style={{ height: 1, background: "var(--jb-line)", margin: "32px 0" }} />

          {!soldOut && item.color && item.color.length > 0 && (
            <div className="mb-6">
              <div className="jb-label">{t("pdp.color")}{color ? ` — ${color}` : ""}</div>
              <div className="flex flex-wrap gap-2">
                {item.color.map((c) => {
                  const sel = c === color;
                  return (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        height: 40,
                        padding: "0 14px",
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        border: sel ? "1px solid #fff" : "1px solid var(--jb-line)",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!soldOut && item.size && item.size.length > 0 && (
            <div className="mb-6">
              <div className="jb-label">{t("pdp.size")}</div>
              <div className="flex flex-wrap gap-2">
                {item.size.map((s) => {
                  const sel = s === size;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      style={{
                        minWidth: 48,
                        height: 44,
                        padding: "0 14px",
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        border: sel ? "1px solid #fff" : "1px solid var(--jb-line)",
                        background: sel ? "#fff" : "transparent",
                        color: sel ? "#000" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!soldOut && (
            <div className="mb-6">
              <div className="jb-label">{t("pdp.qty")}</div>
              <input
                type="number"
                min={1}
                max={item.stock_quantity}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(item.stock_quantity, Number(e.target.value) || 1)))}
                className="jb-input"
                style={{ maxWidth: 120 }}
              />
              <div
                className="mt-2"
                style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
              >
                {item.stock_quantity} {t("pdp.instock")}
              </div>
            </div>
          )}

          {warning && (
            <div
              className="mb-4"
              style={{
                border: "1px solid #fff",
                padding: "10px 14px",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
              }}
            >
              {warning}
            </div>
          )}

          {soldOut ? (
            <button className="jb-btn w-full mt-4" disabled>{t("card.soldout")}</button>
          ) : (
            <button className="jb-btn w-full mt-4" onClick={handleAdd}>
              {t("pdp.addbag")}
            </button>
          )}

          <div
            className="mt-6"
            style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--jb-muted)" }}
          >
            {t("pdp.ship")}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto w-full">
          <div className="jb-eyebrow mb-6">{t("section.viewall")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {related.map((r) => (
              <ProductCard key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
