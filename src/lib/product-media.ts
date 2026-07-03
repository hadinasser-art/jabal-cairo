import { supabase, type Item, type ProductVariant } from "./supabase";

export type ProductMedia = {
  label: string;
  url: string;
  color: string | null;
  kind: "gallery" | "thumbnail";
  sort_order: number;
};

export type ProductMediaConfig = {
  colorOrder: string[];
  sizeChartUrl: string | null;
  media: ProductMedia[];
};

const SHORTS_PRODUCT_ID = "e13c0513-522d-4133-af02-2c6f0c33e9ce";
const OVERSIZED_TSHIRT_PRODUCT_ID = "c5d77496-59d1-4dc5-baf0-1d6f34352ea9";

const FALLBACK_COLOR_ORDER: Record<string, string[]> = {
  [OVERSIZED_TSHIRT_PRODUCT_ID]: ["Orange", "Navy Blue", "Baby Blue"],
};

const FALLBACK_SIZE_CHARTS: Record<string, string> = {
  [SHORTS_PRODUCT_ID]:
    "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/short%20measurements.jpg",
};

const WIDE_LEG_SIZE_CHART_URL =
  "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/women/wide%20leg/wide%20leg%20women%20chart.jpg";

const FALLBACK_MEDIA: Record<string, ProductMedia[]> = {
  [SHORTS_PRODUCT_ID]: [
    media(
      "Black",
      "Black",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/black.jpg",
      10,
      "thumbnail",
    ),
    media(
      "Gray",
      "Gray",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/gray.jpg",
      20,
      "thumbnail",
    ),
    media(
      "Sage",
      "Sage",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/sage.jpg",
      30,
      "thumbnail",
    ),
    media(
      "Steel Blue",
      "Steel Blue",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/Steel%20Blue.jpg",
      40,
      "thumbnail",
    ),
  ],
  [OVERSIZED_TSHIRT_PRODUCT_ID]: [
    media(
      "Orange",
      "Front",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/front.png?v=20260702172413",
      10,
    ),
    media(
      "Orange",
      "Side",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/side.png?v=20260702172413",
      20,
    ),
    media(
      "Orange",
      "Back",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/back.png?v=20260702172413",
      30,
    ),
    media(
      "Orange",
      "Fit",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/3%3A4.png?v=20260702172413",
      40,
    ),
    media(
      "Baby Blue",
      "Front",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/front.png?v=20260702015922",
      10,
    ),
    media(
      "Baby Blue",
      "Side",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/side.png?v=20260702015922",
      20,
    ),
    media(
      "Baby Blue",
      "Detail",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/image.png?v=20260702015922",
      30,
    ),
    media(
      "Baby Blue",
      "Fit",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/3%3A4.png?v=20260702015922",
      40,
    ),
    media(
      "Navy Blue",
      "Front",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/front.png?v=20260702155114",
      10,
    ),
    media(
      "Navy Blue",
      "Side",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/side.png?v=20260702155114",
      20,
    ),
    media(
      "Navy Blue",
      "Back",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/back.png?v=20260702155114",
      30,
    ),
    media(
      "Navy Blue",
      "Fit",
      "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/3%3A4.png?v=20260702155114",
      40,
    ),
  ],
};

function media(
  color: string | null,
  label: string,
  url: string,
  sort_order: number,
  kind: ProductMedia["kind"] = "gallery",
): ProductMedia {
  return { color, label, url, sort_order, kind };
}

export async function fetchProductMediaConfig(item: Item): Promise<ProductMediaConfig> {
  const fallback = getFallbackProductMediaConfig(item);

  try {
    const [itemResult, mediaResult] = await Promise.all([
      supabase.from("items").select("size_chart_url,color_order").eq("id", item.id).maybeSingle(),
      supabase
        .from("product_media")
        .select("label,url,color,kind,sort_order")
        .eq("item_id", item.id)
        .order("sort_order", { ascending: true }),
    ]);

    const itemMeta = itemResult.data as {
      size_chart_url?: string | null;
      color_order?: string[] | null;
    } | null;
    const rows = ((mediaResult.data as ProductMedia[] | null) ?? []).filter((row) => row.url);

    return {
      colorOrder: itemMeta?.color_order?.length ? itemMeta.color_order : fallback.colorOrder,
      sizeChartUrl: itemMeta?.size_chart_url || fallback.sizeChartUrl,
      media: rows.length > 0 ? rows : fallback.media,
    };
  } catch {
    return fallback;
  }
}

export function getFallbackProductMediaConfig(item: Item): ProductMediaConfig {
  const label = `${item.name} ${item.category ?? ""}`.toLowerCase();
  const sizeChartUrl =
    FALLBACK_SIZE_CHARTS[item.id] || (label.includes("wide leg") ? WIDE_LEG_SIZE_CHART_URL : null);

  return {
    colorOrder: FALLBACK_COLOR_ORDER[item.id] ?? [],
    sizeChartUrl,
    media: FALLBACK_MEDIA[item.id] ?? [],
  };
}

export function getInitialProductColor(item: Item, config: ProductMediaConfig) {
  if (config.colorOrder.length > 0) {
    return config.colorOrder.find((color) => item.color?.includes(color)) ?? null;
  }
  return item.color && item.color.length === 1 ? item.color[0] : null;
}

export function getProductColorImage(
  item: Item,
  selectedColor: string | null,
  config: ProductMediaConfig,
) {
  if (!selectedColor) return item.image_url;
  return (
    config.media.find((row) => row.color === selectedColor && row.kind === "thumbnail")?.url ||
    config.media.find((row) => row.color === selectedColor)?.url ||
    item.image_url
  );
}

export function getProductGalleryImages(
  item: Item,
  selectedColor: string | null,
  selectedImage: string | null,
  variants: ProductVariant[],
  config: ProductMediaConfig,
) {
  const configured = uniqueGalleryImages(
    config.media
      .filter((row) => row.kind === "gallery" && (!selectedColor || row.color === selectedColor))
      .map(({ label, url }) => ({ label, url })),
  );
  if (configured.length > 0) return configured;

  return uniqueGalleryImages([
    ...(selectedImage ? [{ label: selectedColor || "Main", url: selectedImage }] : []),
    ...variants
      .filter((variant) => !selectedColor || variant.color === selectedColor)
      .map((variant) => ({ label: variant.size, url: variant.image_url || "" })),
  ]);
}

export function hasProductImageVariants(
  item: Item,
  variants: ProductVariant[],
  config: ProductMediaConfig,
) {
  return config.media.length > 0 || variants.some((variant) => Boolean(variant.image_url));
}

export function colorSortValue(config: ProductMediaConfig, color: string) {
  const index = config.colorOrder.indexOf(color);
  return index === -1 ? config.colorOrder.length : index;
}

function uniqueGalleryImages(images: { label: string; url: string }[]) {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}
