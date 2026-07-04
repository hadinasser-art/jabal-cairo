import { supabase } from "./supabase";

export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type ProductReviewPhoto = {
  id: string;
  review_id: string;
  storage_path: string;
  status: ReviewStatus;
  content_type: string | null;
  file_size: number | null;
  sort_order: number;
  signed_url?: string | null;
};

export type ProductReview = {
  id: string;
  user_id: string;
  item_id: string;
  variant_id: string | null;
  order_id: string;
  rating: number;
  review_text: string;
  display_name: string;
  selected_color: string | null;
  selected_size: string | null;
  status: ReviewStatus;
  verified_buyer: boolean;
  moderation_note: string | null;
  created_at: string;
  approved_at: string | null;
  product_review_photos?: ProductReviewPhoto[];
  item?: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type ReviewEligiblePurchase = {
  order_id: string;
  item_id: string;
  variant_id: string | null;
  selected_color: string | null;
  selected_size: string | null;
  purchased_at: string;
};

const REVIEW_PHOTO_BUCKET = "review-photos";
const MAX_REVIEW_PHOTOS = 4;
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function reviewPhotoRules() {
  return {
    maxCount: MAX_REVIEW_PHOTOS,
    maxBytes: MAX_REVIEW_PHOTO_BYTES,
    mimeTypes: REVIEW_PHOTO_TYPES,
  };
}

export async function fetchApprovedProductReviews(itemId: string) {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      "id,user_id,item_id,variant_id,order_id,rating,review_text,display_name,selected_color,selected_size,status,verified_buyer,moderation_note,created_at,approved_at,product_review_photos(id,review_id,storage_path,status,content_type,file_size,sort_order)",
    )
    .eq("item_id", itemId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingReviewSchema(error)) return [];
    throw error;
  }
  return signReviewPhotoUrls((data as ProductReview[]) || []);
}

export async function fetchReviewEligiblePurchases(itemId: string) {
  const { data, error } = await supabase.rpc("get_review_eligible_purchases", {
    p_item_id: itemId,
  });

  if (error) {
    if (isMissingReviewSchema(error)) return [];
    throw error;
  }
  return (data as ReviewEligiblePurchase[]) || [];
}

export async function uploadReviewPhotos(userId: string, files: File[]) {
  const uploadedPaths: string[] = [];

  for (const file of files.slice(0, MAX_REVIEW_PHOTOS)) {
    validateReviewPhoto(file);
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(REVIEW_PHOTO_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    uploadedPaths.push(path);
  }

  return uploadedPaths;
}

export async function submitProductReview(input: {
  itemId: string;
  variantId: string | null;
  orderId: string;
  rating: number;
  reviewText: string;
  displayName: string;
  photoPaths: string[];
}) {
  const { data, error } = await supabase.rpc("submit_product_review", {
    p_item_id: input.itemId,
    p_variant_id: input.variantId,
    p_order_id: input.orderId,
    p_rating: input.rating,
    p_review_text: input.reviewText,
    p_display_name: input.displayName,
    p_photo_paths: input.photoPaths,
  });

  if (error) throw error;
  return data as string;
}

export async function fetchAdminReviews(status: ReviewStatus | "all" = "pending") {
  let query = supabase
    .from("product_reviews")
    .select(
      "id,user_id,item_id,variant_id,order_id,rating,review_text,display_name,selected_color,selected_size,status,verified_buyer,moderation_note,created_at,approved_at,item:items(id,name),product_review_photos(id,review_id,storage_path,status,content_type,file_size,sort_order)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    if (isMissingReviewSchema(error)) return [];
    throw error;
  }
  return signReviewPhotoUrls((data as ProductReview[]) || []);
}

export async function moderateProductReview(
  reviewId: string,
  status: Exclude<ReviewStatus, "pending">,
  rejectedPhotoIds: string[] = [],
) {
  const { error } = await supabase.rpc("admin_moderate_product_review", {
    p_review_id: reviewId,
    p_status: status,
    p_moderation_note: null,
    p_rejected_photo_ids: rejectedPhotoIds,
  });

  if (error) throw error;
}

export function reviewSummary(reviews: ProductReview[]) {
  if (reviews.length === 0) return { average: 0, count: 0, photoCount: 0 };
  const ratingTotal = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const photoCount = reviews.reduce(
    (sum, review) =>
      sum +
      (review.product_review_photos || []).filter((photo) => photo.status === "approved").length,
    0,
  );
  return {
    average: ratingTotal / reviews.length,
    count: reviews.length,
    photoCount,
  };
}

async function signReviewPhotoUrls(reviews: ProductReview[]) {
  const signed = await Promise.all(
    reviews.map(async (review) => {
      const photos = review.product_review_photos || [];
      const signedPhotos = await Promise.all(
        photos.map(async (photo) => {
          const { data } = await supabase.storage
            .from(REVIEW_PHOTO_BUCKET)
            .createSignedUrl(photo.storage_path, 60 * 60);
          return { ...photo, signed_url: data?.signedUrl ?? null };
        }),
      );
      return { ...review, product_review_photos: signedPhotos };
    }),
  );
  return signed;
}

function validateReviewPhoto(file: File) {
  if (!REVIEW_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Photos must be JPG, PNG, or WebP.");
  }
  if (file.size > MAX_REVIEW_PHOTO_BYTES) {
    throw new Error("Each photo must be 5MB or smaller.");
  }
}

function isMissingReviewSchema(error: { code?: string; message?: string }) {
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("product_reviews") ||
    message.includes("product_review_photos") ||
    message.includes("get_review_eligible_purchases")
  );
}

function safeFileName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "review-photo.jpg";
}
