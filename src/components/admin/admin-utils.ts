import type { ProductReview } from "@/lib/reviews";
import {
  ORDER_STATUSES,
  type AdminInventoryRow,
  type AdminOrderRow,
  type OrderStatus,
  type PaymentStatus,
} from "@/components/admin/types";

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function paymentMethodLabel(value: string | null) {
  if (value === "cod") return "Cash on delivery";
  if (value === "instapay") return "InstaPay";
  return value || "Not set";
}

export function statusLabel(status: string) {
  if (status === "needs_action") return "needs action";
  if (status === "cod_pending") return "COD pending";
  return status;
}

export function orderNeedsAction(order: AdminOrderRow) {
  return (
    order.payment_status === "pending" ||
    order.payment_status === "failed" ||
    (order.payment_status === "paid" &&
      order.order_status !== "delivered" &&
      !order.tracking_number) ||
    (order.payment_status === "cod_pending" && order.order_status === "delivered")
  );
}

export function getAllowedOrderStatuses(paymentStatus: PaymentStatus) {
  if (paymentStatus === "pending") {
    return ORDER_STATUSES.filter(
      (status) =>
        status !== "confirmed" &&
        status !== "processing" &&
        status !== "shipped" &&
        status !== "delivered",
    );
  }
  return ORDER_STATUSES;
}

export function statusBadgeClass(value: string, kind: "payment" | "order") {
  if (kind === "payment") {
    const status = value as PaymentStatus;
    if (status === "paid") return "border-[#72d38a] bg-[#07150b] text-[#b6f2c5]";
    if (status === "pending") return "border-[#e7c75f] bg-[#171203] text-[#f4dda0]";
    if (status === "cod_pending") return "border-[#7fb5ff] bg-[#06111f] text-[#bdd9ff]";
    if (status === "refunded") return "border-[#c69cff] bg-[#12091d] text-[#dfccff]";
    return "border-[#ff8f8f] bg-[#1d0707] text-[#ffc6c6]";
  }

  const status = value as OrderStatus;
  if (status === "delivered") return "border-[#72d38a] bg-[#07150b] text-[#b6f2c5]";
  if (status === "shipped" || status === "processing") {
    return "border-[#7fb5ff] bg-[#06111f] text-[#bdd9ff]";
  }
  if (status === "confirmed") return "border-[#e7c75f] bg-[#171203] text-[#f4dda0]";
  if (status === "cancelled") return "border-[#ff8f8f] bg-[#1d0707] text-[#ffc6c6]";
  return "border-border bg-muted text-muted-foreground";
}

export function orderMatchesQuery(order: AdminOrderRow, query: string) {
  return [
    order.order_id,
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    order.shipping_address,
    order.order_summary,
    order.payment_reference,
    order.tracking_number,
    order.payment_status,
    order.order_status,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function productFromVariant(variant: AdminInventoryRow) {
  return Array.isArray(variant.item) ? variant.item[0] : variant.item;
}

export function inventoryMatchesQuery(variant: AdminInventoryRow, query: string) {
  const product = productFromVariant(variant);
  return [product?.name, product?.gender, variant.color, variant.size, variant.sku]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function orderSummaryLines(value: string | null) {
  const lines = (value || "")
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : ["No item details"];
}

export function productNameFromReview(review: ProductReview) {
  const item = Array.isArray(review.item) ? review.item[0] : review.item;
  return item?.name || "Product";
}

export function sortInventory(rows: AdminInventoryRow[]) {
  return [...rows].sort((a, b) => {
    const productCompare = (productFromVariant(a)?.name || "").localeCompare(
      productFromVariant(b)?.name || "",
    );
    if (productCompare !== 0) return productCompare;
    const colorCompare = a.color.localeCompare(b.color);
    if (colorCompare !== 0) return colorCompare;
    return sizeSortValue(a.size) - sizeSortValue(b.size) || a.size.localeCompare(b.size);
  });
}

function sizeSortValue(size: string) {
  const order = ["S", "M", "L", "XL", "XXL"];
  const index = order.indexOf(size.trim().toUpperCase());
  return index === -1 ? order.length : index;
}
