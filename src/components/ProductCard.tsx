import { Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";
import { formatPrice, type Item } from "@/lib/supabase";

export function ProductCard({ item }: { item: Item }) {
  const { addItem } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.sold_out || item.stock_quantity <= 0) return;
    const size = item.size?.[0] ?? null;
    const color = item.color?.[0] ?? null;
    addItem({
      id: item.id,
      name: item.name,
      price_egp: item.price_egp,
      image_url: item.image_url,
      selectedSize: size,
      selectedColor: color,
      quantity: 1,
      stock_quantity: item.stock_quantity,
    });
    notifyAddedToBag({
      name: item.name, size, color,
      onView: () => navigate({ to: "/cart" }), t,
    });
  };

  const swatches = (item.color || []).slice(0, 4);
  const soldOut = item.sold_out || item.stock_quantity <= 0;

  return (
    <Link to="/product/$id" params={{ id: item.id }} className="pc group">
      <div className="pc-img-wrap">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="pc-img" loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#141414" }} />
        )}
        {soldOut ? (
          <div className="pc-soldout">{t("card.soldout")}</div>
        ) : (
          <button type="button" className="pc-quickadd" onClick={quickAdd}>
            {t("card.quickadd")}
          </button>
        )}
      </div>
      <div className="mt-3">
        <div style={{ fontSize: 13, color: "#fff" }}>{item.name}</div>
        <div style={{ fontSize: 13, color: "#9a9a9a", marginTop: 2 }}>{formatPrice(item.price_egp)}</div>
        {swatches.length > 0 && (
          <div className="flex gap-[6px] mt-2">
            {swatches.map((c) => (
              <span key={c} title={c} style={{
                width: 10, height: 10, borderRadius: 999, background: swatchColor(c),
                border: "1px solid #262626", display: "inline-block",
              }} />
            ))}
          </div>
        )}
        {item.size && item.size.length > 0 && (
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#777", marginTop: 6 }}>
            {item.size.join(" · ")}
          </div>
        )}
      </div>
    </Link>
  );
}

function swatchColor(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    black: "#111", white: "#fff", grey: "#9a9a9a", gray: "#9a9a9a",
    beige: "#d8c9b0", cream: "#f1ead9", sand: "#cdb892",
    navy: "#1c2540", blue: "#3b5b8c", olive: "#6b6a3a",
    green: "#3d5a3f", brown: "#5a3f2c", red: "#7a2a23",
    pink: "#e6c4c4", yellow: "#d8c25a", purple: "#5a3f6b",
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  return "#cfcfcf";
}
