import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import { supabase, type Item, formatPrice } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { ProductCard } from "./index";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [item, setItem] = useState<Item | null>(null);
  const [related, setRelated] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

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
            setSize(it.size?.[0] ?? null);
            setColor(it.color?.[0] ?? null);
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

  const handleAdd = () => {
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
    navigate({ to: "/cart" });
  };

  return (
    <Layout>
      <div className="grid md:grid-cols-[55%_45%] gap-0 max-w-[1600px] mx-auto">
        <div className="relative bg-black/5">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover aspect-[3/4] md:aspect-auto md:min-h-[80vh]" />
          ) : (
            <div className="aspect-[3/4] bg-black/5" />
          )}
          {item.sold_out && (
            <div className="soldout-overlay">
              <span className="jabal-tag text-base px-4 py-2">Sold Out</span>
            </div>
          )}
        </div>

        <div className="p-6 md:p-12 flex flex-col">
          <div className="text-[0.7rem] uppercase tracking-[0.15em] font-bold opacity-60">
            {item.category || "Product"}
          </div>
          <h1 className="mt-2 font-black uppercase" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {item.name}
          </h1>
          <div className="mt-4 font-bold" style={{ fontSize: "1.8rem" }}>
            {formatPrice(item.price_egp)}
          </div>
          {item.description && (
            <p className="mt-6 text-sm md:text-base leading-relaxed">{item.description}</p>
          )}

          <div className="my-8 border-t border-black/10" />

          {!item.sold_out && item.size && item.size.length > 0 && (
            <div className="mb-6">
              <span className="jabal-label">Size</span>
              <div className="flex flex-wrap gap-2">
                {item.size.map((s) => {
                  const sel = s === size;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className="min-w-[48px] h-[44px] px-4 text-sm font-bold uppercase tracking-[0.1em]"
                      style={{
                        border: "1.5px solid #000",
                        background: sel ? "#000" : "#fff",
                        color: sel ? "#fff" : "#000",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!item.sold_out && item.color && item.color.length > 0 && (
            <div className="mb-6">
              <span className="jabal-label">Color</span>
              <div className="flex flex-wrap gap-2">
                {item.color.map((c) => {
                  const sel = c === color;
                  return (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="h-[44px] px-4 text-sm font-bold uppercase tracking-[0.1em]"
                      style={{
                        border: "1.5px solid #000",
                        background: sel ? "#000" : "#fff",
                        color: sel ? "#fff" : "#000",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!item.sold_out && (
            <div className="mb-6">
              <span className="jabal-label">Quantity</span>
              <input
                type="number"
                min={1}
                max={item.stock_quantity}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(item.stock_quantity, Number(e.target.value) || 1)))}
                className="jabal-input"
                style={{ maxWidth: 120 }}
                disabled={item.sold_out}
              />
              <div className="mt-2 text-xs opacity-60 uppercase tracking-[0.1em]">
                {item.stock_quantity} in stock
              </div>
            </div>
          )}

          {item.sold_out ? (
            <div className="mt-4">
              <span className="jabal-tag text-sm px-4 py-2">Sold Out</span>
              <button className="jabal-btn w-full mt-4" disabled>Unavailable</button>
            </div>
          ) : (
            <button className="jabal-btn w-full mt-4" onClick={handleAdd}>
              Add to Cart
            </button>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-[-0.03em] mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((r) => (
              <ProductCard key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
