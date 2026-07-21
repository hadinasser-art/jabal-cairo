import type { ReviewStatus } from "@/lib/reviews";
import { productNameFromReview } from "@/components/admin/admin-utils";
import { SectionCard } from "@/components/admin/AdminUi";
import { REVIEW_STATUS_FILTERS, type DashboardSummary } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <SectionCard eyebrow="Reviews" title="Customer review moderation">
      <Tabs value={status} onValueChange={(value) => onStatusChange(value as ReviewStatus | "all")}>
        <TabsList className="mb-5 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-muted/40 p-1">
          {REVIEW_STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter} value={filter} className="capitalize">
              {filter} ({summary.reviewCounts[filter] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-3">
        {summary.filteredReviews.map((review) => {
          const productName = productNameFromReview(review);
          const approvedPhotos = (review.product_review_photos || []).filter(
            (photo) => photo.status !== "rejected" && photo.status !== "hidden",
          );
          return (
            <Card key={review.id} className="rounded-none bg-card/30 shadow-none">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {review.status}
                    </Badge>
                    <h3 className="mt-2 text-base font-medium">{productName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {review.display_name} · {review.order_id}
                      {review.selected_color ? ` · ${review.selected_color}` : ""}
                      {review.selected_size ? ` · ${review.selected_size}` : ""}
                    </p>
                  </div>
                  <div aria-label={`${review.rating} out of 5 stars`} className="text-sm">
                    {"★".repeat(review.rating)}
                    <span className="text-muted-foreground/40">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 leading-7 text-foreground/85">{review.review_text}</p>
                {approvedPhotos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {approvedPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.signed_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="block size-24 overflow-hidden bg-muted"
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.status !== "approved" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onModerate(review.id, "approved")}
                      disabled={moderatingReviewId === review.id}
                    >
                      Approve
                    </Button>
                  )}
                  {review.status !== "rejected" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onModerate(review.id, "rejected")}
                      disabled={moderatingReviewId === review.id}
                    >
                      Reject
                    </Button>
                  )}
                  {review.status !== "hidden" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onModerate(review.id, "hidden")}
                      disabled={moderatingReviewId === review.id}
                    >
                      Hide
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {summary.filteredReviews.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews match this filter
          </p>
        )}
      </div>
    </SectionCard>
  );
}
