import { ChevronRight } from "lucide-react";
import {
  dateLabel,
  monthLabel,
  orderNeedsAction,
  productFromVariant,
} from "@/components/admin/admin-utils";
import { EmptyState, Metric, Section, StatusBadge } from "@/components/admin/AdminUi";
import type { AdminOrderRow, DashboardSummary } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/supabase";

const SHORTLIST_SIZE = 5;

interface OverviewSectionProps {
  orders: AdminOrderRow[];
  inventoryCount: number;
  summary: DashboardSummary;
  onOpenOrders: (query?: string) => void;
  onOpenInventory: (query?: string) => void;
}

export function OverviewSection({
  orders,
  inventoryCount,
  summary,
  onOpenOrders,
  onOpenInventory,
}: OverviewSectionProps) {
  const needsAction = orders.filter(orderNeedsAction);
  const pendingReviews = summary.reviewCounts.pending ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total revenue"
          value={formatPrice(summary.totalRevenue)}
          hint="All time, paid orders"
        />
        <Metric
          label="This month"
          value={formatPrice(Number(summary.currentMonth?.total_revenue_egp || 0))}
          hint={
            summary.currentMonth
              ? `${summary.currentMonth.paid_order_count} paid orders`
              : "No paid orders yet"
          }
        />
        <Metric
          label="Best month"
          value={
            summary.bestMonth ? formatPrice(Number(summary.bestMonth.total_revenue_egp || 0)) : "—"
          }
          hint={summary.bestMonth ? monthLabel(summary.bestMonth.month_start) : undefined}
        />
        <Metric label="Paid orders" value={String(summary.paidOrders)} hint="All time" />
        <Metric
          label="Stock units"
          value={String(summary.totalStock)}
          hint={`Across ${inventoryCount} variants`}
        />
        <Metric
          label="Low stock"
          value={String(summary.lowStock.length)}
          hint="Variants at 3 or fewer"
          tone={summary.lowStock.length > 0 ? "attention" : "default"}
        />
        <Metric
          label="Needs action"
          value={String(needsAction.length)}
          hint="Orders awaiting a decision"
          tone={needsAction.length > 0 ? "attention" : "default"}
        />
        <Metric
          label="Pending reviews"
          value={String(pendingReviews)}
          hint="Awaiting moderation"
          tone={pendingReviews > 0 ? "attention" : "default"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          eyebrow="Orders"
          title="Needs action"
          description="Unpaid, failed, or paid without tracking."
          bodyClassName="p-0"
          actions={
            needsAction.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenOrders()}>
                View all
              </Button>
            )
          }
        >
          {needsAction.length === 0 ? (
            <EmptyState title="Nothing needs action" description="Every order is up to date." />
          ) : (
            <ul>
              {needsAction.slice(0, SHORTLIST_SIZE).map((order) => (
                <li key={order.order_id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpenOrders(order.order_id)}
                    className="flex w-full items-center gap-4 px-5 py-3.5 text-start transition-colors hover:bg-[var(--jb-product-bg)] sm:px-6"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{order.order_id}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {order.customer_name || order.customer_email || "Guest"} ·{" "}
                        {dateLabel(order.created_at)}
                      </span>
                    </span>
                    <StatusBadge value={order.payment_status} kind="payment" />
                    <span className="hidden shrink-0 text-sm tabular-nums sm:block">
                      {formatPrice(Number(order.total_price_egp || 0))}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          eyebrow="Inventory"
          title="Low stock"
          description="Variants with three units or fewer left."
          bodyClassName="p-0"
          actions={
            summary.lowStock.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenInventory()}>
                View all
              </Button>
            )
          }
        >
          {summary.lowStock.length === 0 ? (
            <EmptyState title="Stock looks healthy" description="No variant is running low." />
          ) : (
            <ul>
              {summary.lowStock.slice(0, SHORTLIST_SIZE).map((variant) => {
                const product = productFromVariant(variant);
                return (
                  <li key={variant.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpenInventory(product?.name || variant.color)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-start transition-colors hover:bg-[var(--jb-product-bg)] sm:px-6"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{product?.name || "Product"}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {variant.color} · {variant.size}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-[#f4dda0]">
                        {variant.stock_quantity} left
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
