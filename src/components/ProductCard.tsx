import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { formatPrice, sortSizes, type Item } from "@/lib/supabase";
import { FavoriteButton } from "@/components/FavoriteButton";

export function ProductCard({ item }: { item: Item }) {
  const { t } = useI18n();

  const swatches = (item.color || []).slice(0, 4);
  const sizes = sortSizes(item.size || []);
  const soldOut = item.sold_out || item.stock_quantity <= 0;

  return (
    <div className="pc group">
      <Link to="/product/$id" params={{ id: item.id }} style={{ display: "block" }}>
        <div className="pc-img-wrap">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="pc-img" loading="lazy" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#141414" }} />
          )}
          {soldOut && (
            <div className="pc-soldout">{t("card.soldout")}</div>
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
          {sizes.length > 0 && (
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#777", marginTop: 6 }}>
              {sizes.join(" · ")}
            </div>
          )}
        </div>
      </Link>
      <FavoriteButton itemId={item.id} itemName={item.name} className="pc-favorite" />
    </div>
  );
}

function swatchColor(name: string): string {
  const n = name.toLowerCase();
  if (n === "black") return "#050505";
  if (n === "gray" || n === "grey") return "#8f8f8f";
  if (n === "sage") return "#727a68";
  if (n === "steel blue") return "#345c92";
  if (n.includes("steel blue")) return "#345c92";
  if (n.includes("sage")) return "#727a68";
  const map: Record<string, string> = {
    black: "#050505", white: "#fff", grey: "#8f8f8f", gray: "#8f8f8f",
    beige: "#d8c9b0", cream: "#f1ead9", sand: "#cdb892",
    navy: "#1c2540", blue: "#3b5b8c", olive: "#6b6a3a",
    green: "#3d5a3f", brown: "#5a3f2c", red: "#7a2a23",
    pink: "#e6c4c4", yellow: "#d8c25a", purple: "#5a3f6b",
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  return "#cfcfcf";
}
