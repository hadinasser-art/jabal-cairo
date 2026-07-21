import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminReviews,
  moderateProductReview,
  type ProductReview,
  type ReviewStatus,
} from "@/lib/reviews";
import { supabase } from "@/lib/supabase";
import {
  inventoryMatchesQuery,
  orderMatchesQuery,
  orderNeedsAction,
  sortInventory,
} from "@/components/admin/admin-utils";
import {
  INVENTORY_PAGE_SIZE,
  ORDER_STATUSES,
  PAGE_SIZE,
  PAYMENT_STATUSES,
  REVIEW_STATUS_FILTERS,
  type AdminInventoryRow,
  type AdminMediaRow,
  type AdminOrderRow,
  type AdminProductRow,
  type DashboardSummary,
  type OrderDraft,
  type OrderStatus,
  type PaymentStatus,
  type RevenueRow,
} from "@/components/admin/types";

export function useAdminDashboard(isAdmin: boolean) {
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryRow[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [media, setMedia] = useState<AdminMediaRow[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [orderQuery, setOrderQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [moderatingReviewId, setModeratingReviewId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const loadAdminData = useCallback(async (clearNotice = true) => {
    setError(null);
    if (clearNotice) setNotice(null);
    setLoadingData(true);
    const [
      revenueResult,
      ordersResult,
      inventoryResult,
      reviewResult,
      productsResult,
      mediaResult,
    ] = await Promise.all([
      supabase
        .from("revenue")
        .select("month_start,total_revenue_egp,paid_order_count")
        .order("month_start", { ascending: true }),
      supabase
        .from("combined_orders")
        .select(
          "order_id,customer_name,customer_email,customer_phone,shipping_address,order_summary,total_items,total_price_egp,payment_method,payment_status,order_status,tracking_number,payment_reference,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("product_variants")
        .select(
          "id,item_id,color,size,stock_quantity,sku,updated_at,item:items(id,name,gender,stock_quantity,sold_out)",
        )
        .order("color", { ascending: true })
        .order("size", { ascending: true }),
      fetchAdminReviews("all")
        .then((data) => ({ data, error: null }))
        .catch((reviewError) => ({ data: null, error: reviewError as Error })),
      supabase
        .from("items")
        .select("id,name,category,gender,image_url,size_chart_url,color_order")
        .order("name", { ascending: true }),
      supabase
        .from("product_media")
        .select("id,item_id,color,label,url,kind,sort_order,updated_at")
        .order("item_id", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);
    setLoadingData(false);

    if (
      revenueResult.error ||
      ordersResult.error ||
      inventoryResult.error ||
      productsResult.error ||
      mediaResult.error
    ) {
      setError(
        revenueResult.error?.message ||
          ordersResult.error?.message ||
          inventoryResult.error?.message ||
          productsResult.error?.message ||
          mediaResult.error?.message ||
          "Admin data failed",
      );
      return;
    }

    setRevenue((revenueResult.data as RevenueRow[]) || []);
    const nextOrders = (ordersResult.data as AdminOrderRow[]) || [];
    const nextInventory = sortInventory((inventoryResult.data as AdminInventoryRow[]) || []);
    setOrders(nextOrders);
    setInventory(nextInventory);
    setReviews((reviewResult.data as ProductReview[]) || []);
    setProducts(((productsResult.data as AdminProductRow[]) || []).slice());
    setMedia((mediaResult.data as AdminMediaRow[]) || []);
    setOrderDrafts(
      Object.fromEntries(
        nextOrders.map((order) => [
          order.order_id,
          {
            payment_status: order.payment_status,
            order_status: order.order_status,
            tracking_number: order.tracking_number ?? "",
            payment_reference: order.payment_reference ?? "",
          },
        ]),
      ),
    );
    setStockDrafts(
      Object.fromEntries(
        nextInventory.map((variant) => [variant.id, String(variant.stock_quantity ?? 0)]),
      ),
    );
    if (reviewResult.error) {
      setError(
        `Reviews are unavailable, but the rest of the dashboard is ready. ${reviewResult.error.message}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadAdminData();
    // Only load when admin status flips. Polling here used to wipe in-progress edits.
  }, [isAdmin, loadAdminData]);

  const updateDraft = (orderId: string, patch: Partial<OrderDraft>) => {
    setOrderDrafts((current) => ({
      ...current,
      [orderId]: {
        payment_status: current[orderId]?.payment_status ?? "pending",
        order_status: current[orderId]?.order_status ?? "new",
        tracking_number: current[orderId]?.tracking_number ?? "",
        payment_reference: current[orderId]?.payment_reference ?? "",
        ...patch,
      },
    }));
  };

  const saveOrder = async (orderId: string, patch: Partial<OrderDraft> = {}) => {
    const draft = orderDrafts[orderId] ? { ...orderDrafts[orderId], ...patch } : null;
    if (!draft) return;

    setError(null);
    setNotice(null);
    setSavingOrderId(orderId);
    const { error: updateError } = await supabase.rpc("admin_update_order", {
      p_order_id: orderId,
      p_payment_status: draft.payment_status,
      p_order_status: draft.order_status,
      p_tracking_number: draft.tracking_number,
      p_payment_reference: draft.payment_reference,
    });
    setSavingOrderId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadAdminData(false);
    setNotice(`${orderId} updated`);
  };

  const changePaymentStatus = (orderId: string, paymentStatus: PaymentStatus) => {
    const patch: Partial<OrderDraft> = { payment_status: paymentStatus };
    if (paymentStatus === "paid" && (orderDrafts[orderId]?.order_status ?? "new") === "new") {
      patch.order_status = "confirmed";
    }
    updateDraft(orderId, patch);
    void saveOrder(orderId, patch);
  };

  const changeOrderStatus = (orderId: string, orderStatus: OrderStatus) => {
    updateDraft(orderId, { order_status: orderStatus });
    void saveOrder(orderId, { order_status: orderStatus });
  };

  const updatePaymentFilter = (status: string) => {
    setPaymentStatusFilter(status);
    setOrderPage(1);
  };

  const updateOrderFilter = (status: string) => {
    setOrderStatusFilter(status);
    setOrderPage(1);
  };

  const saveStock = async (variantId: string) => {
    const nextStock = Number(stockDrafts[variantId]);
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setError("Stock must be a whole number, zero or more");
      return;
    }

    setError(null);
    setNotice(null);
    setSavingVariantId(variantId);
    const { error: updateError } = await supabase.rpc("admin_update_variant_stock", {
      p_variant_id: variantId,
      p_stock_quantity: nextStock,
    });
    setSavingVariantId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadAdminData(false);
    setNotice("Stock updated");
  };

  const moderateReview = async (
    reviewId: string,
    status: Exclude<ReviewStatus, "pending">,
    rejectedPhotoIds: string[] = [],
  ) => {
    setError(null);
    setNotice(null);
    setModeratingReviewId(reviewId);
    try {
      await moderateProductReview(reviewId, status, rejectedPhotoIds);
      await loadAdminData(false);
      setNotice(`Review ${status}`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review update failed");
    } finally {
      setModeratingReviewId(null);
    }
  };

  const summary = useMemo<DashboardSummary>(() => {
    const totalRevenue = revenue.reduce((sum, row) => sum + Number(row.total_revenue_egp || 0), 0);
    const paidOrders = revenue.reduce((sum, row) => sum + Number(row.paid_order_count || 0), 0);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonth = revenue.find((row) => row.month_start.slice(0, 7) === currentMonthKey);
    const bestMonth = [...revenue].sort(
      (a, b) => Number(b.total_revenue_egp || 0) - Number(a.total_revenue_egp || 0),
    )[0];
    const totalStock = inventory.reduce(
      (sum, variant) => sum + Number(variant.stock_quantity || 0),
      0,
    );
    const lowStock = inventory.filter(
      (variant) => variant.stock_quantity > 0 && variant.stock_quantity <= 3,
    );
    const actionOrders = orders.filter(orderNeedsAction);
    const paymentFilteredOrders =
      paymentStatusFilter === "all"
        ? orders
        : paymentStatusFilter === "needs_action"
          ? actionOrders
          : orders.filter((order) => order.payment_status === paymentStatusFilter);
    const statusFilteredOrders =
      orderStatusFilter === "all"
        ? paymentFilteredOrders
        : paymentFilteredOrders.filter((order) => order.order_status === orderStatusFilter);
    const normalizedOrderQuery = orderQuery.trim().toLowerCase();
    const filteredOrders = normalizedOrderQuery
      ? statusFilteredOrders.filter((order) => orderMatchesQuery(order, normalizedOrderQuery))
      : statusFilteredOrders;
    const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const safeOrderPage = Math.min(orderPage, orderPageCount);
    const pagedOrders = filteredOrders.slice(
      (safeOrderPage - 1) * PAGE_SIZE,
      safeOrderPage * PAGE_SIZE,
    );
    const normalizedInventoryQuery = inventoryQuery.trim().toLowerCase();
    const filteredInventory = normalizedInventoryQuery
      ? inventory.filter((variant) => inventoryMatchesQuery(variant, normalizedInventoryQuery))
      : inventory;
    const inventoryPageCount = Math.max(
      1,
      Math.ceil(filteredInventory.length / INVENTORY_PAGE_SIZE),
    );
    const safeInventoryPage = Math.min(inventoryPage, inventoryPageCount);
    const pagedInventory = filteredInventory.slice(
      (safeInventoryPage - 1) * INVENTORY_PAGE_SIZE,
      safeInventoryPage * INVENTORY_PAGE_SIZE,
    );
    const paymentCounts = PAYMENT_STATUSES.reduce<Record<string, number>>((counts, status) => {
      counts[status] = orders.filter((order) => order.payment_status === status).length;
      return counts;
    }, {});
    paymentCounts.needs_action = actionOrders.length;
    const orderCounts = ORDER_STATUSES.reduce<Record<string, number>>((counts, status) => {
      counts[status] = orders.filter((order) => order.order_status === status).length;
      return counts;
    }, {});
    const filteredReviews =
      reviewStatusFilter === "all"
        ? reviews
        : reviews.filter((review) => review.status === reviewStatusFilter);
    const reviewCounts = REVIEW_STATUS_FILTERS.reduce<Record<string, number>>((counts, status) => {
      counts[status] =
        status === "all"
          ? reviews.length
          : reviews.filter((review) => review.status === status).length;
      return counts;
    }, {});

    return {
      totalRevenue,
      paidOrders,
      currentMonth,
      bestMonth,
      totalStock,
      lowStock,
      filteredOrders,
      pagedOrders,
      filteredInventory,
      pagedInventory,
      orderPageCount,
      safeOrderPage,
      inventoryPageCount,
      safeInventoryPage,
      paymentCounts,
      orderCounts,
      filteredReviews,
      reviewCounts,
    };
  }, [
    revenue,
    inventory,
    orders,
    reviews,
    paymentStatusFilter,
    orderStatusFilter,
    reviewStatusFilter,
    orderQuery,
    inventoryQuery,
    orderPage,
    inventoryPage,
  ]);

  return {
    revenue,
    orders,
    inventory,
    products,
    media,
    setInventory,
    setProducts,
    setMedia,
    orderDrafts,
    stockDrafts,
    paymentStatusFilter,
    orderStatusFilter,
    reviewStatusFilter,
    orderQuery,
    inventoryQuery,
    orderPage,
    inventoryPage,
    savingOrderId,
    savingVariantId,
    moderatingReviewId,
    notice,
    error,
    loadingData,
    summary,
    loadAdminData,
    setNotice,
    setError,
    updateDraft,
    saveOrder,
    changePaymentStatus,
    changeOrderStatus,
    updatePaymentFilter,
    updateOrderFilter,
    setReviewStatusFilter,
    setOrderQuery,
    setInventoryQuery,
    setOrderPage,
    setInventoryPage,
    setStockDrafts,
    saveStock,
    moderateReview,
  };
}
