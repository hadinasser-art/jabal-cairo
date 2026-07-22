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
import {
  colorSortValue,
  fetchProductMediaConfig,
  getFallbackProductMediaConfig,
  getInitialProductColor,
  getProductColorImage,
  getProductGalleryImages,
  hasProductImageVariants,
  type ProductMediaConfig,
} from "@/lib/product-media";
import { useCart } from "@/lib/cart";
import { notifyAddedToBag } from "@/lib/notify";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { OfferCountdown } from "@/components/OfferCountdown";
import { fetchOffers, type Offer } from "@/lib/offer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useAuth } from "@/lib/auth";
import {
  fetchApprovedProductReviews,
  fetchReviewEligiblePurchases,
  reviewPhotoRules,
  reviewSummary,
  submitProductReview,
  uploadReviewPhotos,
  type ProductReview,
  type ReviewEligiblePurchase,
} from "@/lib/reviews";

export const Route = createFileRoute("/product/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    color: typeof search.color === "string" ? search.color : null,
  }),
  component: ProductPage,
});

function compareVariantOptions(config: ProductMediaConfig, a: ProductVariant, b: ProductVariant) {
  const colorSort =
    config.colorOrder.length > 0
      ? colorSortValue(config, a.color) - colorSortValue(config, b.color)
      : 0;

  return (
    colorSort ||
    a.color.localeCompare(b.color) ||
    sizeSortValue(a.size) - sizeSortValue(b.size) ||
    a.size.localeCompare(b.size)
  );
}

function dateLabel(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

const reviewMutedText = {
  color: "#9a9a9a",
  fontSize: 13,
  lineHeight: 1.5,
};

const reviewNoticeStyle = {
  border: "1px solid #262626",
  padding: "10px 12px",
  color: "#fff",
  fontSize: 12,
  lineHeight: 1.45,
  marginBottom: 12,
};

function getRequestedProductColor(item: Item, requestedColor: string | null) {
  if (!requestedColor) return null;
  return item.color?.find((color) => color.toLowerCase() === requestedColor.toLowerCase()) ?? null;
}

function ProductPage() {
  const { id } = Route.useParams();
  const { color: requestedColor } = Route.useSearch();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useI18n();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [mediaConfig, setMediaConfig] = useState<ProductMediaConfig | null>(null);
  const [related, setRelated] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [eligiblePurchases, setEligiblePurchases] = useState<ReviewEligiblePurchase[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryTouchStart, setGalleryTouchStart] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers().then(setOffers);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    setReviewName((current) => current || user.email?.split("@")[0] || "");
  }, [user]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [id, color]);

  useEffect(() => {
    setItem(null);
    setErr(null);
    setVariants([]);
    setMediaConfig(null);
    setReviews([]);
    setEligiblePurchases([]);
    setReviewOrderId("");
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
            const fallbackConfig = getFallbackProductMediaConfig(it);
            const initialColor = getRequestedProductColor(it, requestedColor);
            setMediaConfig(fallbackConfig);
            setSize(it.size && it.size.length === 1 ? it.size[0] : null);
            setColor(initialColor ?? getInitialProductColor(it, fallbackConfig));
            fetchProductMediaConfig(it).then((config) => {
              setMediaConfig(config);
              setVariants((current) =>
                [...current].sort((a, b) => compareVariantOptions(config, a, b)),
              );
              setColor(
                (current) =>
                  getRequestedProductColor(it, requestedColor) ||
                  current ||
                  getInitialProductColor(it, config),
              );
            });
            supabase
              .from("product_variants")
              .select("*")
              .eq("item_id", it.id)
              .order("color", { ascending: true })
              .order("size", { ascending: true })
              .then(({ data: variantRows, error: variantError }) => {
                if (variantError && !/product_variants/i.test(variantError.message))
                  console.warn("product_variants", variantError.message);
                const rows = ((variantRows as ProductVariant[]) || []).sort((a, b) =>
                  compareVariantOptions(fallbackConfig, a, b),
                );
                setVariants(rows);
                if (rows.length > 0) {
                  const firstAvailable =
                    rows.find((variant) => variant.stock_quantity > 0) || rows[0];
                  setColor(
                    (current) =>
                      getRequestedProductColor(it, requestedColor) ||
                      current ||
                      firstAvailable.color,
                  );
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
  }, [id, requestedColor]);

  useEffect(() => {
    let cancelled = false;

    fetchApprovedProductReviews(id)
      .then((nextReviews) => {
        if (!cancelled) setReviews(nextReviews);
      })
      .catch((error) => {
        if (!cancelled) console.warn("product reviews", error.message);
      });

    if (user) {
      fetchReviewEligiblePurchases(id)
        .then((purchases) => {
          if (cancelled) return;
          setEligiblePurchases(purchases);
          setReviewOrderId((current) => current || purchases[0]?.order_id || "");
        })
        .catch((error) => {
          if (!cancelled) console.warn("review eligibility", error.message);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  if (err)
    return (
      <Layout>
        <div className="p-6">
          <ErrorBanner />
        </div>
      </Layout>
    );
  if (!item || !mediaConfig)
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
  const mediaColors = mediaConfig.media
    .map((row) => row.color)
    .filter((c): c is string => Boolean(c));
  const colorOptions = hasVariants
    ? Array.from(new Set([...variants.map((variant) => variant.color), ...mediaColors]))
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
    selectedVariant?.image_url ||
    selectedColorImage ||
    getProductColorImage(item, color, mediaConfig);
  const galleryImages = getProductGalleryImages(item, color, selectedImage, variants, mediaConfig);
  const activeGalleryImage = galleryImages[galleryIndex]?.url || selectedImage;
  const imageVariantProduct = hasProductImageVariants(item, variants, mediaConfig);
  const sizeChartUrl = mediaConfig.sizeChartUrl;
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

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setReviewError("Log in to review your purchase.");
      return;
    }
    const selectedPurchase =
      eligiblePurchases.find((purchase) => purchase.order_id === reviewOrderId) ||
      eligiblePurchases[0];
    if (!selectedPurchase) {
      setReviewError("Only verified buyers can review this product.");
      return;
    }

    setReviewError(null);
    setReviewMessage(null);
    setReviewSubmitting(true);
    try {
      const photoPaths = await uploadReviewPhotos(user.id, reviewFiles);
      await submitProductReview({
        itemId: item.id,
        variantId: selectedPurchase.variant_id,
        orderId: selectedPurchase.order_id,
        rating: reviewRating,
        reviewText,
        displayName: reviewName,
        photoPaths,
      });
      setReviewMessage("Thanks. Your review is waiting for approval.");
      setReviewText("");
      setReviewFiles([]);
      setReviewRating(5);
      const [nextReviews, nextPurchases] = await Promise.all([
        fetchApprovedProductReviews(item.id),
        fetchReviewEligiblePurchases(item.id),
      ]);
      setReviews(nextReviews);
      setEligiblePurchases(nextPurchases);
      setReviewOrderId(nextPurchases[0]?.order_id || "");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review could not be submitted.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const selectedColorReviews = color
    ? [
        ...reviews.filter((review) => review.selected_color === color),
        ...reviews.filter((review) => review.selected_color !== color),
      ]
    : reviews;
  const selectedReviewSummary = reviewSummary(selectedColorReviews);
  const approvedReviewPhotos = selectedColorReviews.flatMap((review) =>
    (review.product_review_photos || [])
      .filter((photo) => photo.status === "approved" && photo.signed_url)
      .map((photo) => ({ ...photo, review })),
  );
  const activeEligiblePurchases = color
    ? eligiblePurchases.filter(
        (purchase) => !purchase.selected_color || purchase.selected_color === color,
      )
    : eligiblePurchases;
  const reviewPurchaseOptions =
    activeEligiblePurchases.length > 0 ? activeEligiblePurchases : eligiblePurchases;
  const photoRules = reviewPhotoRules();

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
                      ?.image_url || getProductColorImage(item, c, mediaConfig);
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

      <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="jb-eyebrow">Customer reviews</div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 300, marginTop: 8 }}>
              Real-life fit and color
            </h2>
          </div>
          <div style={{ color: "#fff", textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 300 }}>
              {selectedReviewSummary.count > 0
                ? `${selectedReviewSummary.average.toFixed(1)} / 5`
                : "No reviews yet"}
            </div>
            <div style={{ ...reviewMutedText, marginTop: 4 }}>
              {selectedReviewSummary.count} review
              {selectedReviewSummary.count === 1 ? "" : "s"} · {selectedReviewSummary.photoCount}{" "}
              photo{selectedReviewSummary.photoCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {approvedReviewPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-10">
            {approvedReviewPhotos.slice(0, 6).map((photo) => (
              <div
                key={photo.id}
                style={{ background: "#141414", aspectRatio: "1 / 1", overflow: "hidden" }}
              >
                <img
                  src={photo.signed_url || ""}
                  alt={`${item.name} customer photo`}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div style={{ borderTop: "1px solid #262626" }}>
            {selectedColorReviews.map((review) => (
              <article
                key={review.id}
                style={{ borderBottom: "1px solid #262626", padding: "22px 0" }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div style={{ color: "#fff", fontSize: 15 }}>
                      {"★".repeat(review.rating)}
                      <span style={{ color: "#444" }}>{"★".repeat(5 - review.rating)}</span>
                    </div>
                    <div style={{ color: "#fff", marginTop: 8 }}>{review.display_name}</div>
                    <div style={{ ...reviewMutedText, marginTop: 3 }}>
                      Verified buyer
                      {review.selected_color ? ` · ${review.selected_color}` : ""}
                      {review.selected_size ? ` · ${review.selected_size}` : ""}
                    </div>
                  </div>
                  <div style={reviewMutedText}>{dateLabel(review.created_at)}</div>
                </div>
                <p style={{ color: "#d8d8d8", lineHeight: 1.7, marginTop: 14 }}>
                  {review.review_text}
                </p>
                {(review.product_review_photos || []).filter(
                  (photo) => photo.status === "approved" && photo.signed_url,
                ).length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-4">
                    {(review.product_review_photos || [])
                      .filter((photo) => photo.status === "approved" && photo.signed_url)
                      .map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.signed_url || ""}
                          alt={`${item.name} review photo`}
                          loading="lazy"
                          style={{
                            width: 86,
                            height: 86,
                            objectFit: "cover",
                            background: "#141414",
                          }}
                        />
                      ))}
                  </div>
                )}
              </article>
            ))}
            {selectedColorReviews.length === 0 && (
              <div
                style={{ color: "#9a9a9a", padding: "24px 0", borderBottom: "1px solid #262626" }}
              >
                No approved reviews yet.
              </div>
            )}
          </div>

          <div style={{ border: "1px solid #262626", padding: 18, alignSelf: "start" }}>
            <div className="jb-eyebrow">Share yours</div>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 400, marginTop: 8 }}>
              Review this product
            </h3>
            {!user ? (
              <div style={{ marginTop: 16 }}>
                <p style={reviewMutedText}>Log in after buying to leave a verified review.</p>
                <Link to="/login" className="jb-btn-ghost mt-4" style={{ width: "100%" }}>
                  Log in
                </Link>
              </div>
            ) : reviewPurchaseOptions.length === 0 ? (
              <p style={{ ...reviewMutedText, marginTop: 16 }}>
                Reviews open after a paid, shipped, or delivered order for this product.
              </p>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ marginTop: 16 }}>
                {reviewPurchaseOptions.length > 1 && (
                  <div className="mb-4">
                    <label className="jb-label" htmlFor="review-order">
                      Purchased option
                    </label>
                    <select
                      id="review-order"
                      value={reviewOrderId}
                      onChange={(event) => setReviewOrderId(event.target.value)}
                      className="jb-input"
                    >
                      {reviewPurchaseOptions.map((purchase) => (
                        <option
                          key={`${purchase.order_id}-${purchase.variant_id}`}
                          value={purchase.order_id}
                        >
                          {[purchase.selected_color, purchase.selected_size, purchase.order_id]
                            .filter(Boolean)
                            .join(" · ")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="jb-label" htmlFor="review-name">
                    Display name
                  </label>
                  <input
                    id="review-name"
                    value={reviewName}
                    onChange={(event) => setReviewName(event.target.value)}
                    className="jb-input"
                    required
                    maxLength={80}
                  />
                </div>
                <div className="mb-4">
                  <label className="jb-label" htmlFor="review-rating">
                    Rating
                  </label>
                  <select
                    id="review-rating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    className="jb-input"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} star{rating === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="jb-label" htmlFor="review-text">
                    Review
                  </label>
                  <textarea
                    id="review-text"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    className="jb-textarea"
                    minLength={12}
                    maxLength={1200}
                    required
                    placeholder="How did the color, fit, and fabric feel in real life?"
                  />
                </div>
                <div className="mb-4">
                  <label className="jb-label" htmlFor="review-photos">
                    Photos optional
                  </label>
                  <input
                    id="review-photos"
                    type="file"
                    accept={photoRules.mimeTypes.join(",")}
                    multiple
                    onChange={(event) =>
                      setReviewFiles(
                        Array.from(event.target.files || []).slice(0, photoRules.maxCount),
                      )
                    }
                    className="jb-input"
                  />
                  <div style={{ ...reviewMutedText, marginTop: 6 }}>
                    Up to {photoRules.maxCount} photos, 5MB each.
                  </div>
                </div>
                {reviewError && <div style={reviewNoticeStyle}>{reviewError}</div>}
                {reviewMessage && <div style={reviewNoticeStyle}>{reviewMessage}</div>}
                <button className="jb-btn w-full" type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Submitting" : "Submit for approval"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

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
