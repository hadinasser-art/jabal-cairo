import { Save } from "lucide-react";
import {
  dateLabel,
  getAllowedOrderStatuses,
  orderSummaryLines,
  paymentMethodLabel,
  statusLabel,
} from "@/components/admin/admin-utils";
import { Pager, SectionCard, StatusBadge } from "@/components/admin/AdminUi";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/supabase";

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
  return (
    <SectionCard eyebrow="Orders" title="Order management">
      <div className="grid gap-4 lg:grid-cols-2">
        <FilterTabs
          label="Payment status"
          value={paymentStatusFilter}
          filters={PAYMENT_STATUS_FILTERS}
          counts={summary.paymentCounts}
          total={orders.length}
          onValueChange={onPaymentFilterChange}
        />
        <FilterTabs
          label="Order status"
          value={orderStatusFilter}
          filters={ORDER_STATUS_FILTERS}
          counts={summary.orderCounts}
          total={orders.length}
          onValueChange={onOrderFilterChange}
        />
      </div>
      <div className="mb-5 max-w-lg space-y-2">
        <Label htmlFor="admin-order-search">Search orders</Label>
        <Input
          id="admin-order-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Order, customer, phone, product, address"
        />
      </div>
      <div className="border">
        <Table className="min-w-[1280px]">
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>What they ordered</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment status</TableHead>
              <TableHead>Order status</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.pagedOrders.map((order) => {
              const draft = orderDrafts[order.order_id] ?? {
                payment_status: order.payment_status,
                order_status: order.order_status,
                tracking_number: order.tracking_number ?? "",
                payment_reference: order.payment_reference ?? "",
              };
              const changed =
                draft.payment_status !== order.payment_status ||
                draft.order_status !== order.order_status ||
                draft.tracking_number !== (order.tracking_number ?? "") ||
                draft.payment_reference !== (order.payment_reference ?? "");
              return (
                <TableRow key={order.order_id}>
                  <TableCell className="align-top">
                    <div>{order.order_id}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {dateLabel(order.created_at)} · {order.total_items ?? 0} item
                      {(order.total_items ?? 0) === 1 ? "" : "s"}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div>{order.customer_name || order.customer_email || "Guest"}</div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">
                      {order.customer_phone || "No phone"}
                    </div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">
                      {order.customer_email || "No email"}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {orderSummaryLines(order.order_summary).map((line, lineIndex) => (
                      <div key={`${order.order_id}-${line}-${lineIndex}`} className="mb-1">
                        {line}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal align-top text-foreground/80">
                    {order.shipping_address || "No address"}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="mb-2">{paymentMethodLabel(order.payment_method)}</div>
                    <Input
                      value={draft.payment_reference}
                      onChange={(event) =>
                        onDraftChange(order.order_id, { payment_reference: event.target.value })
                      }
                      placeholder="Payment ref"
                      aria-label={`Payment reference for ${order.order_id}`}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusBadge value={draft.payment_status} kind="payment" />
                    {draft.payment_status === "pending" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="my-2 w-full"
                        onClick={() => onPaymentStatusChange(order.order_id, "paid")}
                        disabled={savingOrderId === order.order_id}
                      >
                        Mark as paid
                      </Button>
                    )}
                    <Select
                      value={draft.payment_status}
                      onValueChange={(value) =>
                        onPaymentStatusChange(order.order_id, value as PaymentStatus)
                      }
                      disabled={savingOrderId === order.order_id}
                    >
                      <SelectTrigger aria-label={`Payment status for ${order.order_id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusBadge value={draft.order_status} kind="order" />
                    <Select
                      value={draft.order_status}
                      onValueChange={(value) =>
                        onOrderStatusChange(order.order_id, value as OrderStatus)
                      }
                      disabled={savingOrderId === order.order_id}
                    >
                      <SelectTrigger
                        className="mt-2"
                        aria-label={`Order status for ${order.order_id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllowedOrderStatuses(draft.payment_status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      value={draft.tracking_number}
                      onChange={(event) =>
                        onDraftChange(order.order_id, { tracking_number: event.target.value })
                      }
                      placeholder="Tracking"
                      aria-label={`Tracking number for ${order.order_id}`}
                    />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {formatPrice(Number(order.total_price_egp || 0))}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onSave(order.order_id)}
                      disabled={!changed || savingOrderId === order.order_id}
                      aria-label={`Save ${order.order_id}`}
                    >
                      <Save aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {summary.filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {orders.length === 0 ? "No orders yet" : "No orders match these filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pager
        page={summary.safeOrderPage}
        pageCount={summary.orderPageCount}
        total={summary.filteredOrders.length}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </SectionCard>
  );
}

function FilterTabs({
  label,
  value,
  filters,
  counts,
  total,
  onValueChange,
}: {
  label: string;
  value: string;
  filters: readonly string[];
  counts: Record<string, number>;
  total: number;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Tabs value={value} onValueChange={onValueChange}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-muted/40 p-1">
          {filters.map((filter) => (
            <TabsTrigger key={filter} value={filter} className="capitalize">
              {statusLabel(filter)} ({filter === "all" ? total : (counts[filter] ?? 0)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
