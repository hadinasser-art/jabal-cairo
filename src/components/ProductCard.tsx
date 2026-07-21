import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { formatPrice, sortSizes, type Item } from "@/lib/supabase";
import { FavoriteButton } from "@/components/FavoriteButton";

const OVERSIZED_TSHIRT_PRODUCT_ID = "c5d77496-59d1-4dc5-baf0-1d6f34352ea9";
const OVERSIZED_TSHIRT_COLOR_ORDER = ["Orange", "Navy Blue", "Baby Blue"];
const OVERSIZED_TSHIRT_CARD_IMAGE_URL =
  "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/front.png?v=20260702172413";

export function ProductCard({ item }: { item: Item }) {
  const { t } = useI18n();

  const imageUrl = getCardImageUrl(item);
  const swatches = sortCardColors(item);
  const sizes = sortSizes(item.size || []);
  const soldOut = item.sold_out || item.stock_quantity <= 0;

  return (
    <div className="pc group">
      <Link
        to="/product/$id"
        params={{ id: item.id }}
        search={{ color: item.display_color ?? null }}
        style={{ display: "block" }}
      >
        <div className="pc-img-wrap">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} className="pc-img" loading="lazy" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#141414" }} />
          )}
          {soldOut && <div className="pc-soldout">{t("card.soldout")}</div>}
        </div>
        <div className="mt-3">
          <div style={{ fontSize: 13, color: "#fff", overflowWrap: "anywhere" }}>{item.name}</div>
          <div style={{ fontSize: 13, color: "#9a9a9a", marginTop: 2 }}>
            {formatPrice(item.price_egp)}
          </div>
          {swatches.length > 0 && (
            <div className="flex flex-wrap gap-[6px] mt-2">
              {swatches.map((c) => (
                <span
                  key={c}
                  title={c}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: swatchColor(c, item),
                    border: "1px solid #3a3a3a",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
          )}
          {sizes.length > 0 && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#777",
                marginTop: 6,
                overflowWrap: "anywhere",
              }}
            >
              {sizes.join(" · ")}
            </div>
          )}
        </div>
      </Link>
      <FavoriteButton itemId={item.id} itemName={item.name} className="pc-favorite" />
    </div>
  );
}

function getCardImageUrl(item: Item) {
  if (item.display_image_url) return item.display_image_url;
  if (item.id === OVERSIZED_TSHIRT_PRODUCT_ID) return OVERSIZED_TSHIRT_CARD_IMAGE_URL;
  return item.image_url;
}

function sortCardColors(item: Item) {
  if (item.display_color) return [item.display_color];
  const colors = item.color || [];
  const colorOrder =
    item.color_order ||
    (item.id === OVERSIZED_TSHIRT_PRODUCT_ID ? OVERSIZED_TSHIRT_COLOR_ORDER : []);
  if (colorOrder.length === 0) return colors;
  return [...colors].sort((a, b) => {
    const aIndex = colorOrder.indexOf(a);
    const bIndex = colorOrder.indexOf(b);
    const aSort = aIndex === -1 ? colorOrder.length : aIndex;
    const bSort = bIndex === -1 ? colorOrder.length : bIndex;
    return aSort - bSort || a.localeCompare(b);
  });
}

function swatchColor(name: string, item?: Item): string {
  const n = name.toLowerCase();
  const productLabel = `${item?.name ?? ""} ${item?.category ?? ""}`.toLowerCase();
  if (productLabel.includes("polo")) {
    if (n === "sage") return "#314f42";
    if (n === "gray" || n === "grey") return "#b8b8b6";
    if (n === "burgundy" || n === "burgandy") return "#45151f";
    if (n === "blue") return "#075fc6";
    if (n === "dark blue") return "#182237";
    if (n === "black") return "#050505";
  }
  if (productLabel.includes("drop shoulder")) {
    if (n === "brown") return "#3a281c";
    if (n === "burgundy" || n === "burgandy") return "#5b1428";
    if (n === "gray" || n === "grey") return "#303333";
    if (n === "green") return "#3d5a3f";
  }
  if (n === "black") return "#050505";
  if (n === "gray" || n === "grey") return "#8f8f8f";
  if (n === "sage") return "#727a68";
  if (n === "orange") return "#f26318";
  if (n === "baby blue") return "#9fc7de";
  if (n === "navy blue") return "#152845";
  if (n === "steel blue") return "#345c92";
  if (n === "dark blue") return "#182237";
  if (n === "burgundy" || n === "burgandy") return "#5b1428";
  if (n === "brown") return "#3a281c";
  if (n.includes("orange")) return "#f26318";
  if (n.includes("baby blue")) return "#9fc7de";
  if (n.includes("navy blue")) return "#152845";
  if (n.includes("steel blue")) return "#345c92";
  if (n.includes("dark blue")) return "#182237";
  if (n.includes("burgundy") || n.includes("burgandy")) return "#5b1428";
  if (n.includes("sage")) return "#727a68";
  const map: Record<string, string> = {
    black: "#050505",
    white: "#fff",
    grey: "#8f8f8f",
    gray: "#8f8f8f",
    beige: "#d8c9b0",
    cream: "#f1ead9",
    sand: "#cdb892",
    orange: "#f26318",
    navy: "#1c2540",
    blue: "#3b5b8c",
    olive: "#6b6a3a",
    green: "#3d5a3f",
    brown: "#5a3f2c",
    red: "#7a2a23",
    pink: "#e6c4c4",
    yellow: "#d8c25a",
    purple: "#5a3f6b",
  };
  for (const k of Object.keys(map)) if (n.includes(k)) return map[k];
  return "#cfcfcf";
}
