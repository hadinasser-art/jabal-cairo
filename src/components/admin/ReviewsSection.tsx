import type { ReviewStatus } from "@/lib/reviews";
import { productNameFromReview } from "@/components/admin/admin-utils";
import { EmptyState, FilterChips, Section } from "@/components/admin/AdminUi";
import { REVIEW_STATUS_FILTERS, type DashboardSummary } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MODERATION_ACTIONS = [
  { status: "approved", label: "Approve" },
  { status: "rejected", label: "Reject" },
  { status: "hidden", label: "Hide" },
] as const;

interface ReviewsSectionProps {
  summary: DashboardSummary;
  status: ReviewStatus | "all";
  moderatingReviewId: string | null;
  onStatusChange: (status: ReviewStatus | "all") => void;
  onModerate: (
    reviewId: string,
    status: Exclude<ReviewStatus, "pending">,
    rejectedPhotoIds?: string[],
  ) => void;
}

export function ReviewsSection({
  summary,
  status,
  moderatingReviewId,
  onStatusChange,
  onModerate,
}: ReviewsSectionProps) {
  return (
    <Section
      eyebrow="Reviews"
      title="Customer review moderation"
      description="Approved reviews appear on the product page."
      bodyClassName="p-0"
    >
      <div className="border-b p-5 sm:p-6">
        <FilterChips
          label="Review status"
          value={status}
          options={REVIEW_STATUS_FILTERS.map((filter) => ({
            value: filter,
            label: filter,
            count: summary.reviewCounts[filter] ?? 0,
          }))}
          onChange={(value) => onStatusChange(value as ReviewStatus | "all")}
        />
      </div>

      {summary.filteredReviews.length === 0 ? (
        <EmptyState
          title="No reviews match this filter"
          description="Switch to All to see every review that has been submitted."
        />
      ) : (
        <ul>
          {summary.filteredReviews.map((review) => {
            const productName = productNameFromReview(review);
            const photos = (review.product_review_photos || []).filter(
              (photo) => photo.status !== "rejected" && photo.status !== "hidden",
            );
            const busy = moderatingReviewId === review.id;
            return (
              <li key={review.id} className="border-b p-5 last:border-b-0 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge variant="outline" className="capitalize">
                      {review.status}
                    </Badge>
                    <h3 className="mt-2.5 text-base font-normal">{productName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {review.display_name} · {review.order_id}
                      {review.selected_color ? ` · ${review.selected_color}` : ""}
                      {review.selected_size ? ` · ${review.selected_size}` : ""}
                    </p>
                  </div>
                  <p aria-label={`${review.rating} out of 5 stars`} className="text-sm">
                    {"★".repeat(review.rating)}
                    <span className="text-muted-foreground/40">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </p>
                </div>

                <p className="mt-4 max-w-3xl leading-7 text-foreground/85">{review.review_text}</p>

                {photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.signed_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="block size-24 overflow-hidden border bg-[var(--jb-product-bg)] transition-opacity hover:opacity-80"
                      >
                        {photo.signed_url && (
                          <img
                            src={photo.signed_url}
                            alt={`${productName} review`}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {MODERATION_ACTIONS.filter((action) => action.status !== review.status).map(
                    (action) => (
                      <Button
                        key={action.status}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onModerate(review.id, action.status)}
                        disabled={busy}
                      >
                        {action.label}
                      </Button>
                    ),
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
