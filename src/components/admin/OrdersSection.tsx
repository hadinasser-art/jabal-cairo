import { useState, type ReactNode } from "react";
import { ChevronDown, Save } from "lucide-react";
import {
  dateLabel,
  getAllowedOrderStatuses,
  orderSummaryLines,
  paymentMethodLabel,
  statusLabel,
} from "@/components/admin/admin-utils";
import {
  EmptyState,
  FilterChips,
  Pager,
  SearchField,
  Section,
  StatusBadge,
  type FilterOption,
} from "@/components/admin/AdminUi";
import {
  ORDER_STATUS_FILTERS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_FILTERS,
  type AdminOrderRow,
  type DashboardSummary,
  type OrderDraft,
  type OrderStatus,
  type PaymentStatus,
} from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface OrdersSectionProps {
  orders: AdminOrderRow[];
  summary: DashboardSummary;
  orderDrafts: Record<string, OrderDraft>;
  paymentStatusFilter: string;
  orderStatusFilter: string;
  query: string;
  savingOrderId: string | null;
  onPaymentFilterChange: (status: string) => void;
  onOrderFilterChange: (status: string) => void;
  onQueryChange: (query: string) => void;
  onDraftChange: (orderId: string, patch: Partial<OrderDraft>) => void;
  onPaymentStatusChange: (orderId: string, status: PaymentStatus) => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onSave: (orderId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

function toOptions(filters: readonly string[], counts: Record<string, number>, total: number) {
  return filters.map<FilterOption>((filter) => ({
    value: filter,
    label: statusLabel(filter),
    count: filter === "all" ? total : (counts[filter] ?? 0),
  }));
}

function draftFor(order: AdminOrderRow, drafts: Record<string, OrderDraft>): OrderDraft {
  return (
    drafts[order.order_id] ?? {
      payment_status: order.payment_status,
      order_status: order.order_status,
      tracking_number: order.tracking_number ?? "",
      payment_reference: order.payment_reference ?? "",
    }
  );
}

function isChanged(order: AdminOrderRow, draft: OrderDraft) {
  return (
    draft.payment_status !== order.payment_status ||
    draft.order_status !== order.order_status ||
    draft.tracking_number !== (order.tracking_number ?? "") ||
    draft.payment_reference !== (order.payment_reference ?? "")
  );
}

export function OrdersSection({
  orders,
  summary,
  orderDrafts,
  paymentStatusFilter,
  orderStatusFilter,
  query,
  savingOrderId,
  onPaymentFilterChange,
  onOrderFilterChange,
  onQueryChange,
  onDraftChange,
  onPaymentStatusChange,
  onOrderStatusChange,
  onSave,
  onPrevious,
  onNext,
}: OrdersSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Section
      eyebrow="Orders"
      title="Order management"
      description="Open an order to edit payment, fulfilment and tracking."
      bodyClassName="p-0"
    >
      <div className="space-y-5 border-b p-5 sm:p-6">
        <SearchField
          id="admin-order-search"
          label="Search orders"
          value={query}
          placeholder="Order, customer, phone, product, address"
          onChange={onQueryChange}
          className="max-w-lg"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <FilterChips
            label="Payment status"
            value={paymentStatusFilter}
            options={toOptions(PAYMENT_STATUS_FILTERS, summary.paymentCounts, orders.length)}
            onChange={onPaymentFilterChange}
          />
          <FilterChips
            label="Order status"
            value={orderStatusFilter}
            options={toOptions(ORDER_STATUS_FILTERS, summary.orderCounts, orders.length)}
            onChange={onOrderFilterChange}
          />
        </div>
      </div>

      {summary.filteredOrders.length === 0 ? (
        <EmptyState
          title={orders.length === 0 ? "No orders yet" : "No orders match these filters"}
          description={
            orders.length === 0
              ? "Orders will appear here as soon as the first one is placed."
              : "Try clearing the search or switching back to All."
          }
        />
      ) : (
        <ul>
          {summary.pagedOrders.map((order) => (
            <OrderRow
              key={order.order_id}
              order={order}
              draft={draftFor(order, orderDrafts)}
              expanded={expandedId === order.order_id}
              saving={savingOrderId === order.order_id}
              onToggle={() =>
                setExpandedId((current) => (current === order.order_id ? null : order.order_id))
              }
              onDraftChange={onDraftChange}
              onPaymentStatusChange={onPaymentStatusChange}
              onOrderStatusChange={onOrderStatusChange}
              onSave={onSave}
            />
          ))}
        </ul>
      )}

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Pager
          page={summary.safeOrderPage}
          pageCount={summary.orderPageCount}
          total={summary.filteredOrders.length}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
    </Section>
  );
}

function OrderRow({
  order,
  draft,
  expanded,
  saving,
  onToggle,
  onDraftChange,
  onPaymentStatusChange,
  onOrderStatusChange,
  onSave,
}: {
  order: AdminOrderRow;
  draft: OrderDraft;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onDraftChange: (orderId: string, patch: Partial<OrderDraft>) => void;
  onPaymentStatusChange: (orderId: string, status: PaymentStatus) => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onSave: (orderId: string) => void;
}) {
  const changed = isChanged(order, draft);
  const panelId = `order-panel-${order.order_id}`;

  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-[var(--jb-product-bg)] sm:px-6",
          expanded && "bg-[var(--jb-product-bg)]",
        )}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            !expanded && "-rotate-90 rtl:rotate-90",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-4">
          <div className="min-w-0">
            <span className="block truncate text-sm">{order.order_id}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {dateLabel(order.created_at)} · {order.total_items ?? 0} item
              {(order.total_items ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-1.5 min-w-0 lg:mt-0">
            <span className="block truncate text-sm text-foreground/80">
              {order.customer_name || order.customer_email || "Guest"}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {order.customer_phone || "No phone"}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 lg:mt-0">
            <StatusBadge value={draft.payment_status} kind="payment" />
            <StatusBadge value={draft.order_status} kind="order" />
            {changed && (
              <Badge variant="outline" className="border-[#e7c75f] text-[#f4dda0]">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="mt-2 text-sm tabular-nums lg:mt-0 lg:text-end">
            {formatPrice(Number(order.total_price_egp || 0))}
          </div>
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t bg-[var(--jb-product-bg)] px-5 py-6 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <dl className="space-y-4 text-sm">
              <DetailRow label="Items">
                {orderSummaryLines(order.order_summary).map((line, index) => (
                  <span key={`${order.order_id}-${line}-${index}`} className="block">
                    {line}
                  </span>
                ))}
              </DetailRow>
              <DetailRow label="Shipping address">
                {order.shipping_address || "No address"}
              </DetailRow>
              <DetailRow label="Contact">
                <span className="block break-all">{order.customer_email || "No email"}</span>
                <span className="block break-all">{order.customer_phone || "No phone"}</span>
              </DetailRow>
              <DetailRow label="Payment method">
                {paymentMethodLabel(order.payment_method)}
              </DetailRow>
            </dl>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`payment-status-${order.order_id}`}>Payment status</Label>
                  <Select
                    value={draft.payment_status}
                    onValueChange={(value) =>
                      onPaymentStatusChange(order.order_id, value as PaymentStatus)
                    }
                    disabled={saving}
                  >
                    <SelectTrigger id={`payment-status-${order.order_id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`order-status-${order.order_id}`}>Order status</Label>
                  <Select
                    value={draft.order_status}
                    onValueChange={(value) =>
                      onOrderStatusChange(order.order_id, value as OrderStatus)
                    }
                    disabled={saving}
                  >
                    <SelectTrigger id={`order-status-${order.order_id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllowedOrderStatuses(draft.payment_status).map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`payment-ref-${order.order_id}`}>Payment reference</Label>
                  <Input
                    id={`payment-ref-${order.order_id}`}
                    value={draft.payment_reference}
                    placeholder="Not set"
                    onChange={(event) =>
                      onDraftChange(order.order_id, { payment_reference: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tracking-${order.order_id}`}>Tracking number</Label>
                  <Input
                    id={`tracking-${order.order_id}`}
                    value={draft.tracking_number}
                    placeholder="Not set"
                    onChange={(event) =>
                      onDraftChange(order.order_id, { tracking_number: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => onSave(order.order_id)}
                  disabled={!changed || saving}
                >
                  <Save aria-hidden="true" />
                  {saving ? "Saving" : "Save changes"}
                </Button>
                {draft.payment_status === "pending" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onPaymentStatusChange(order.order_id, "paid")}
                    disabled={saving}
                  >
                    Mark as paid
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="jb-eyebrow">{label}</dt>
      <dd className="mt-1.5 leading-6 text-foreground/85">{children}</dd>
    </div>
  );
}
