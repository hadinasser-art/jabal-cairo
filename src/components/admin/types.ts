import type { ProductReview, ReviewStatus } from "@/lib/reviews";

export type RevenueRow = {
  month_start: string;
  total_revenue_egp: number;
  paid_order_count: number;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "cod_pending" | "refunded";
export type OrderStatus =
  "new" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export type AdminOrderRow = {
  order_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  order_summary: string | null;
  total_items: number | null;
  total_price_egp: number | null;
  payment_method: string | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_number: string | null;
  payment_reference: string | null;
  created_at: string | null;
};

export type AdminInventoryItem = {
  id: string;
  name: string;
  gender: string | null;
  stock_quantity: number | null;
  sold_out: boolean | null;
};

export type AdminInventoryRow = {
  id: string;
  item_id: string;
  color: string;
  size: string;
  stock_quantity: number;
  sku: string | null;
  updated_at: string | null;
  item: AdminInventoryItem | AdminInventoryItem[] | null;
};

export type OrderDraft = {
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_number: string;
  payment_reference: string;
};

export type AdminProductRow = {
  id: string;
  name: string;
  category: string | null;
  gender: string | null;
  image_url: string | null;
  size_chart_url: string | null;
  color_order: string[] | null;
};

export type MediaKind = "gallery" | "thumbnail";

export type AdminMediaRow = {
  id: string;
  item_id: string;
  color: string | null;
  label: string;
  url: string;
  kind: MediaKind;
  sort_order: number;
  updated_at: string | null;
};

export type UploadJob = {
  id: string;
  color: string | null;
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  message?: string;
};

export type DashboardSummary = {
  totalRevenue: number;
  paidOrders: number;
  currentMonth: RevenueRow | undefined;
  bestMonth: RevenueRow | undefined;
  totalStock: number;
  lowStock: AdminInventoryRow[];
  filteredOrders: AdminOrderRow[];
  pagedOrders: AdminOrderRow[];
  filteredInventory: AdminInventoryRow[];
  pagedInventory: AdminInventoryRow[];
  orderPageCount: number;
  safeOrderPage: number;
  inventoryPageCount: number;
  safeInventoryPage: number;
  paymentCounts: Record<string, number>;
  orderCounts: Record<string, number>;
  filteredReviews: ProductReview[];
  reviewCounts: Record<string, number>;
};

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "cod_pending",
  "refunded",
];
export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
export const PAYMENT_STATUS_FILTERS = ["all", "needs_action", ...PAYMENT_STATUSES] as const;
export const ORDER_STATUS_FILTERS = ["all", ...ORDER_STATUSES] as const;
export const REVIEW_STATUS_FILTERS: (ReviewStatus | "all")[] = [
  "pending",
  "approved",
  "rejected",
  "hidden",
  "all",
];
export const PAGE_SIZE = 12;
export const INVENTORY_PAGE_SIZE = 10;
