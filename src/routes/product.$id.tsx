import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Skeleton, ErrorBanner } from "@/components/Layout";
import {
  supabase,
  type Item,
  type ProductVariant,
  formatPrice,
  sortSizes,
  sizeSortValue,
} from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { OfferCountdown } from "@/components/OfferCountdown";
import { fetchOffers, type Offer } from "@/lib/offer";
import { FavoriteButton } from "@/components/FavoriteButton";

const SHORTS_PRODUCT_ID = "e13c0513-522d-4133-af02-2c6f0c33e9ce";
const OVERSIZED_TSHIRT_PRODUCT_ID = "c5d77496-59d1-4dc5-baf0-1d6f34352ea9";
const SHORTS_SIZE_CHART_URL =
  "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/short%20measurements.jpg";
const WIDE_LEG_SIZE_CHART_URL =
  "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/women/wide%20leg/wide%20leg%20women%20chart.jpg";
const SHORTS_COLOR_IMAGES: Record<string, string> = {
  Black:
    "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/black.jpg",
  Gray: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/gray.jpg",
  Sage: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/sage.jpg",
  "Steel Blue":
    "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/shorts/Steel%20Blue.jpg",
};
const OVERSIZED_TSHIRT_GALLERY_IMAGES: Record<string, { label: string; url: string }[]> = {
  Orange: [
    {
      label: "Front",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/front.png?v=20260702001751",
    },
    {
      label: "Side",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/side.png?v=20260702001751",
    },
    {
      label: "Back",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/back.png?v=20260702001751",
    },
    {
      label: "Fit",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/orange/3%3A4.png?v=20260702001751",
    },
  ],
  "Baby Blue": [
    {
      label: "Front",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/front.png?v=20260702015922",
    },
    {
      label: "Side",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/side.png?v=20260702015922",
    },
    {
      label: "Detail",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/image.png?v=20260702015922",
    },
    {
      label: "Fit",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/baby%20blue/3%3A4.png?v=20260702015922",
    },
  ],
  "Navy Blue": [
    {
      label: "Front",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/front.png?v=20260702015039",
    },
    {
      label: "Side",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/side.png?v=20260702015039",
    },
    {
      label: "Back",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/back.png?v=20260702015039",
    },
    {
      label: "Fit",
      url: "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/products/men/oversized%20tshirt/navy%20blue/3%3A4.png?v=20260702015039",
    },
  ],
};

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function getVariantImage(item: Item, selectedColor: string | null) {
  if (item.id === SHORTS_PRODUCT_ID && selectedColor && SHORTS_COLOR_IMAGES[selectedColor]) {
    return SHORTS_COLOR_IMAGES[selectedColor];
  }
  return item.image_url;
}

function hasImageVariants(item: Item) {
  return item.id === SHORTS_PRODUCT_ID || item.id === OVERSIZED_TSHIRT_PRODUCT_ID;
}

function uniqueGalleryImages(images: { label: string; url: string }[]) {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function getGalleryImages(
  item: Item,
  selectedColor: string | null,
  selectedImage: string | null,
  variants: ProductVariant[],
) {
  if (item.id === OVERSIZED_TSHIRT_PRODUCT_ID && selectedColor) {
    return uniqueGalleryImages([
      ...(OVERSIZED_TSHIRT_GALLERY_IMAGES[selectedColor] ?? []),
      ...(selectedImage ? [{ label: selectedColor, url: selectedImage }] : []),
    ]);
  }

  return uniqueGalleryImages([
    ...(selectedImage ? [{ label: selectedColor || "Main", url: selectedImage }] : []),
    ...variants
      .filter((variant) => !selectedColor || variant.color === selectedColor)
      .map((variant) => ({ label: variant.size, url: variant.image_url || "" })),
  ]);
}

function getSizeChartUrl(item: Item) {
  if (item.id === SHORTS_PRODUCT_ID) return SHORTS_SIZE_CHART_URL;
  const label = `${item.name} ${item.category ?? ""}`.toLowerCase();
  if (label.includes("wide leg")) return WIDE_LEG_SIZE_CHART_URL;
  return null;
}

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useI18n();
  const [item, setItem] = useState<Item | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [related, setRelated] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryTouchStart, setGalleryTouchStart] = useState<number | null>(null);

  useEffect(() => {
    fetchOffers().then(setOffers);
  }, []);

  useEffect(() => {
    setGalleryIndex(0);
  }, [id, color]);

  useEffect(() => {
    setItem(null);
    setErr(null);
    setVariants([]);
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
            setColor(
              it.id === SHORTS_PRODUCT_ID
                ? (it.color?.[0] ?? null)
                : it.color && it.color.length === 1
                  ? it.color[0]
                  : null,
            );
            supabase
              .from("product_variants")
              .select("*")
              .eq("item_id", it.id)
              .order("color", { ascending: true })
              .order("size", { ascending: true })
              .then(({ data: variantRows, error: variantError }) => {
                if (variantError && !/product_variants/i.test(variantError.message))
                  console.warn("product_variants", variantError.message);
                const rows = ((variantRows as ProductVariant[]) || []).sort(
                  (a, b) =>
                    a.color.localeCompare(b.color) ||
                    sizeSortValue(a.size) - sizeSortValue(b.size) ||
                    a.size.localeCompare(b.size),
                );
                setVariants(rows);
                if (rows.length > 0) {
                  const firstAvailable =
                    rows.find((variant) => variant.stock_quantity > 0) || rows[0];
                  setColor((current) => current ?? firstAvailable.color);
                }
              });
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

  if (err)
    return (
      <Layout>
        <div className="p-6">
          <ErrorBanner />
        </div>
      </Layout>
    );
  if (!item)
    return (
      <Layout>
        <div className="grid lg:grid-cols-2 gap-8 p-6 md:p-12 max-w-7xl mx-auto">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Layout>
    );

  const hasVariants = variants.length > 0;
  const colorOptions = hasVariants
    ? Array.from(new Set(variants.map((variant) => variant.color)))
    : item.color || [];
  const sizeOptions = hasVariants
    ? sortSizes(
        Array.from(
          new Set(
            variants
              .filter((variant) => !color || variant.color === color)
              .map((variant) => variant.size),
          ),
        ),
      )
    : sortSizes(item.size || []);
  const variantFor = (variantColor: string | null, variantSize: string | null) =>
    variants.find((variant) => variant.color === variantColor && variant.size === variantSize) ||
    null;
  const selectedVariant = hasVariants ? variantFor(color, size) : null;
  const selectedStock = hasVariants ? (selectedVariant?.stock_quantity ?? 0) : item.stock_quantity;
  const totalVariantStock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  const soldOut = hasVariants ? totalVariantStock <= 0 : item.sold_out || item.stock_quantity <= 0;
  const selectedChoiceSoldOut =
    hasVariants && Boolean(color && size && (!selectedVariant || selectedStock <= 0));
  const selectedSoldOutText = selectedChoiceSoldOut
    ? `${[color, size].filter(Boolean).join(" / ")} ${t("card.soldout")}`
    : null;
  const selectedColorImage = color
    ? (variants.find((variant) => variant.color === color && variant.image_url)?.image_url ?? null)
    : null;
  const selectedImage =
    selectedVariant?.image_url || selectedColorImage || getVariantImage(item, color);
  const galleryImages = getGalleryImages(item, color, selectedImage, variants);
  const activeGalleryImage = galleryImages[galleryIndex]?.url || selectedImage;
  const imageVariantProduct =
    hasImageVariants(item) || variants.some((variant) => Boolean(variant.image_url));
  const sizeChartUrl = getSizeChartUrl(item);
  const maxQty = Math.max(1, selectedStock);

  const goToPreviousGalleryImage = () => {
    if (galleryImages.length < 2) return;
    setGalleryIndex((current) => (current === 0 ? galleryImages.length - 1 : current - 1));
  };

  const goToNextGalleryImage = () => {
    if (galleryImages.length < 2) return;
    setGalleryIndex((current) => (current === galleryImages.length - 1 ? 0 : current + 1));
  };

  const handleGalleryTouchEnd = (clientX: number) => {
    if (galleryTouchStart === null || galleryImages.length < 2) return;
    const distance = galleryTouchStart - clientX;
    if (Math.abs(distance) > 40) {
      if (distance > 0) goToNextGalleryImage();
      else goToPreviousGalleryImage();
    }
    setGalleryTouchStart(null);
  };

  const handleAdd = () => {
    setWarning(null);
    if (sizeOptions.length > 0 && !size) {
      setWarning(t("pdp.selectsize"));
      return;
    }
    if (colorOptions.length > 0 && !color) {
      setWarning(t("pdp.selectcolor"));
      return;
    }
    if (hasVariants && (!selectedVariant || selectedVariant.stock_quantity <= 0)) {
      setWarning(t("card.soldout"));
      return;
    }
    addItem({
      id: item.id,
      variantId: selectedVariant?.id ?? null,
      name: item.name,
      price_egp: item.price_egp,
      image_url: selectedImage,
      selectedSize: size,
      selectedColor: color,
      quantity: Math.min(qty, selectedStock),
      stock_quantity: selectedStock,
    });
    notifyAddedToBag({ name: item.name, size, color, onView: () => navigate({ to: "/cart" }), t });
  };

  return (
    <Layout>
      <div
        className="px-6 md:px-12 pt-6 max-w-[1600px] mx-auto"
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#9a9a9a",
        }}
      >
        <Link to="/" style={{ color: "#9a9a9a" }}>
          JABAL
        </Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link to="/shop" style={{ color: "#9a9a9a" }}>
          {t("nav.shop")}
        </Link>
        {item.category && (
          <>
            <span style={{ margin: "0 8px" }}>/</span>
            <span>{item.category}</span>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[60%_40%] gap-0 max-w-[1600px] mx-auto mt-6">
        <div style={{ background: "#141414" }} className="relative overflow-hidden">
          {activeGalleryImage ? (
            <div className="pdp-gallery" aria-label={`${item.name} images`}>
              <div
                className="pdp-gallery-track"
                style={{ transform: `translateX(-${galleryIndex * 100}%)` }}
                onTouchStart={(event) => setGalleryTouchStart(event.touches[0]?.clientX ?? null)}
                onTouchEnd={(event) => handleGalleryTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
              >
                {(galleryImages.length > 0
                  ? galleryImages
                  : [{ label: "Main", url: activeGalleryImage }]
                ).map((image) => (
                  <div className="pdp-gallery-slide" key={image.url}>
                    <img
                      src={image.url}
                      alt={[item.name, color, image.label].filter(Boolean).join(" - ")}
                      className="w-full h-full object-cover aspect-[3/4] lg:aspect-auto lg:min-h-[80vh]"
                    />
                  </div>
                ))}
              </div>
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="pdp-gallery-arrow pdp-gallery-arrow-left"
                    onClick={goToPreviousGalleryImage}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="pdp-gallery-arrow pdp-gallery-arrow-right"
                    onClick={goToNextGalleryImage}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="pdp-gallery-dots">
                    {galleryImages.map((image, index) => (
                      <button
                        key={image.url}
                        type="button"
                        className={index === galleryIndex ? "is-active" : ""}
                        onClick={() => setGalleryIndex(index)}
                        aria-label={`Show ${image.label}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-[3/4]" style={{ background: "#141414" }} />
          )}
          {(soldOut || selectedChoiceSoldOut) && (
            <div className="pc-soldout" style={{ fontSize: 13, textAlign: "center", padding: 18 }}>
              {selectedSoldOutText || t("card.soldout")}
            </div>
          )}
        </div>

        <div className="p-6 md:p-12 flex flex-col">
          {item.category && <div className="jb-eyebrow">{item.category}</div>}
          <h1
            style={{
              marginTop: 8,
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              color: "#fff",
            }}
          >
            {item.name}
          </h1>
          <div
            className="flex items-center justify-between gap-4 flex-wrap"
            style={{ marginTop: 12 }}
          >
            <div style={{ fontSize: 16, color: "#fff" }}>{formatPrice(item.price_egp)}</div>
            <FavoriteButton
              itemId={item.id}
              itemName={item.name}
              variantId={selectedVariant?.id ?? null}
              requireVariant={hasVariants}
            />
          </div>
          <div className="mt-5">
            <OfferCountdown offers={offers} onExpire={() => fetchOffers().then(setOffers)} />
          </div>
          {item.description && (
            <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: "#9a9a9a" }}>
              {item.description}
            </p>
          )}

          <div style={{ height: 1, background: "#262626", margin: "32px 0" }} />

          {!soldOut && colorOptions.length > 0 && (
            <div className="mb-6">
              <div className="jb-label">
                {t("pdp.color")}
                {color ? ` — ${color}` : ""}
              </div>
              <div
                className={
                  imageVariantProduct
                    ? "flex flex-wrap gap-2 max-w-full sm:max-w-[360px]"
                    : "flex flex-wrap gap-2"
                }
              >
                {colorOptions.map((c) => {
                  const sel = c === color;
                  const variantImage =
                    variants.find((variant) => variant.color === c && variant.image_url)
                      ?.image_url || getVariantImage(item, c);
                  const colorStock = hasVariants
                    ? variants
                        .filter((variant) => variant.color === c)
                        .reduce((sum, variant) => sum + variant.stock_quantity, 0)
                    : item.stock_quantity;
                  const colorSoldOut = colorStock <= 0;
                  if (imageVariantProduct) {
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColor(c);
                          setSize(null);
                          setQty(1);
                          setWarning(colorSoldOut ? `${c} ${t("card.soldout")}` : null);
                        }}
                        style={{
                          padding: 0,
                          border: sel ? "1px solid #fff" : "1px solid #262626",
                          background: "#0a0a0a",
                          color: "#fff",
                          cursor: "pointer",
                          opacity: colorSoldOut && !sel ? 0.68 : 1,
                          textAlign: "start",
                          width: 72,
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: "1 / 1",
                            background: "#141414",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          {variantImage && (
                            <img
                              src={variantImage}
                              alt={`${item.name} ${c}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          )}
                          {colorSoldOut && (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(0,0,0,0.58)",
                                color: "#fff",
                                fontSize: 8,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                textAlign: "center",
                                padding: 6,
                              }}
                            >
                              {t("card.soldout")}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: "7px 6px",
                            fontSize: 9,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: sel ? "#fff" : "#9a9a9a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c}
                        </div>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c);
                        setSize(null);
                        setQty(1);
                        setWarning(colorSoldOut ? `${c} ${t("card.soldout")}` : null);
                      }}
                      style={{
                        minHeight: 46,
                        padding: "0 14px",
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        border: sel ? "1px solid #fff" : "1px solid #262626",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        opacity: colorSoldOut && !sel ? 0.68 : 1,
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                      }}
                    >
                      <span style={{ overflowWrap: "anywhere" }}>{c}</span>
                      {colorSoldOut && (
                        <span style={{ fontSize: 8, letterSpacing: "0.08em", color: "#9a9a9a" }}>
                          {t("card.soldout")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {sizeChartUrl && (
                <div style={{ marginTop: 14 }}>
                  <a
                    href={sizeChartUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 34,
                      border: "1px solid #fff",
                      color: "#fff",
                      background: "transparent",
                      padding: "8px 12px",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                  >
                    {t("pdp.sizeChart")}
                  </a>
                </div>
              )}
            </div>
          )}

          {!soldOut && sizeOptions.length > 0 && (
            <div className="mb-6">
              <div className="jb-label">{t("pdp.size")}</div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => {
                  const sel = s === size;
                  const stockForSize = hasVariants
                    ? (variantFor(color, s)?.stock_quantity ?? 0)
                    : item.stock_quantity;
                  const sizeSoldOut = stockForSize <= 0;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setSize(s);
                        setQty(1);
                        setWarning(
                          sizeSoldOut
                            ? `${[color, s].filter(Boolean).join(" / ")} ${t("card.soldout")}`
                            : null,
                        );
                      }}
                      title={
                        sizeSoldOut ? t("card.soldout") : `${stockForSize} ${t("pdp.instock")}`
                      }
                      style={{
                        minWidth: 64,
                        minHeight: 58,
                        padding: "8px 12px",
                        fontSize: 12,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        border: sel ? "1px solid #fff" : "1px solid #262626",
                        background: sel && !sizeSoldOut ? "#fff" : "#050505",
                        color: sel && !sizeSoldOut ? "#000" : "#fff",
                        cursor: "pointer",
                        opacity: sizeSoldOut && !sel ? 0.72 : 1,
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <span>{s}</span>
                      {sizeSoldOut && (
                        <span
                          style={{
                            fontSize: 8,
                            letterSpacing: "0.08em",
                            color: sel ? "#fff" : "#9a9a9a",
                          }}
                        >
                          {t("card.soldout")}
                        </span>
                      )}
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
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                className="jb-input"
                style={{ maxWidth: 120 }}
                disabled={(hasVariants && !selectedVariant) || selectedChoiceSoldOut}
              />
              <div
                className="mt-2"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#9a9a9a",
                }}
              >
                {selectedChoiceSoldOut
                  ? selectedSoldOutText || t("card.soldout")
                  : hasVariants && !selectedVariant
                    ? t("pdp.selectsize")
                    : `${selectedStock} ${t("pdp.instock")}`}
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

          {soldOut || selectedChoiceSoldOut ? (
            <button className="jb-btn w-full mt-4" disabled>
              {t("card.soldout")}
            </button>
          ) : (
            <button className="jb-btn w-full mt-4" onClick={handleAdd}>
              {t("pdp.addbag")}
            </button>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto w-full">
          <div className="jb-eyebrow mb-6">{t("pdp.related")}</div>
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
