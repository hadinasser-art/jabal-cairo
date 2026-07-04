import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { formatPrice, supabase } from "@/lib/supabase";
import {
  fetchAdminReviews,
  moderateProductReview,
  type ProductReview,
  type ReviewStatus,
} from "@/lib/reviews";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — JABAL" }] }),
  component: AdminPage,
});

type RevenueRow = {
  month_start: string;
  total_revenue_egp: number;
  paid_order_count: number;
};

type AdminOrderRow = {
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

type AdminInventoryItem = {
  id: string;
  name: string;
  gender: string | null;
  stock_quantity: number | null;
  sold_out: boolean | null;
};

type AdminInventoryRow = {
  id: string;
  item_id: string;
  color: string;
  size: string;
  stock_quantity: number;
  sku: string | null;
  updated_at: string | null;
  item: AdminInventoryItem | AdminInventoryItem[] | null;
};

type OrderDraft = {
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  tracking_number: string;
  payment_reference: string;
};

type PaymentStatus = "pending" | "paid" | "failed" | "cod_pending" | "refunded";
type OrderStatus = "new" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "cod_pending", "refunded"];
const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUS_FILTERS = ["all", "needs_action", ...PAYMENT_STATUSES] as const;
const ORDER_STATUS_FILTERS = ["all", ...ORDER_STATUSES] as const;
const REVIEW_STATUS_FILTERS: (ReviewStatus | "all")[] = [
  "pending",
  "approved",
  "rejected",
  "hidden",
  "all",
];
const PAGE_SIZE = 12;

function AdminPage() {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryRow[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [orderQuery, setOrderQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [moderatingReviewId, setModeratingReviewId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = async (clearNotice = true) => {
    setError(null);
    if (clearNotice) setNotice(null);
    setLoadingData(true);
    const [revenueResult, ordersResult, inventoryResult, reviewResult] = await Promise.all([
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
    ]);
    setLoadingData(false);

    if (revenueResult.error || ordersResult.error || inventoryResult.error || reviewResult.error) {
      setError(
        revenueResult.error?.message ||
          ordersResult.error?.message ||
          inventoryResult.error?.message ||
          reviewResult.error?.message ||
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
  };

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

  const changePaymentStatus = (orderId: string, payment_status: PaymentStatus) => {
    const patch: Partial<OrderDraft> = { payment_status };
    if (payment_status === "paid" && (orderDrafts[orderId]?.order_status ?? "new") === "new") {
      patch.order_status = "confirmed";
    }
    updateDraft(orderId, patch);
    saveOrder(orderId, patch);
  };

  const markOrderPaid = (orderId: string) => {
    changePaymentStatus(orderId, "paid");
  };

  const changeOrderStatus = (orderId: string, order_status: OrderStatus) => {
    updateDraft(orderId, { order_status });
    saveOrder(orderId, { order_status });
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!adminLoading && isAdmin) loadAdminData();
  }, [user, loading, adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin, reviewStatusFilter]);

  const summary = useMemo(() => {
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
    const actionOrders = orders.filter((order) => orderNeedsAction(order));
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
      orderPageCount,
      safeOrderPage,
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
  ]);

  if (loading || adminLoading) {
    return (
      <Layout>
        <AdminShell>
          <div style={{ color: "#9a9a9a", fontSize: 13 }}>Loading</div>
        </AdminShell>
      </Layout>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <Layout>
        <AdminShell>
          <div style={{ maxWidth: 520 }}>
            <div className="jb-eyebrow">Admin</div>
            <h1 style={pageTitle}>Access required</h1>
            <p style={mutedText}>Signed in as {user.email}</p>
            <div style={{ marginTop: 24 }}>
              <Link to="/account" className="jb-btn-ghost">
                Account
              </Link>
            </div>
          </div>
        </AdminShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <AdminShell>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="jb-eyebrow">Admin</div>
            <h1 style={pageTitle}>Dashboard</h1>
            <div style={mutedText}>{user.email}</div>
          </div>
          <button
            className="jb-btn-ghost inline-flex items-center gap-2"
            onClick={() => loadAdminData()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {loadingData ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 24,
              border: "1px solid #fff",
              padding: "12px 14px",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            style={{
              marginTop: 24,
              border: "1px solid #333",
              padding: "12px 14px",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {notice}
          </div>
        )}

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          <Metric label="Total revenue" value={formatPrice(summary.totalRevenue)} />
          <Metric label="Paid orders" value={String(summary.paidOrders)} />
          <Metric
            label="This month"
            value={formatPrice(Number(summary.currentMonth?.total_revenue_egp || 0))}
          />
          <Metric
            label="Best month"
            value={
              summary.bestMonth
                ? `${monthLabel(summary.bestMonth.month_start)} · ${formatPrice(Number(summary.bestMonth.total_revenue_egp || 0))}`
                : "—"
            }
          />
          <Metric label="Stock units" value={String(summary.totalStock)} />
          <Metric label="Low stock" value={String(summary.lowStock.length)} />
          <Metric label="Needs action" value={String(summary.paymentCounts.needs_action ?? 0)} />
          <Metric label="Pending reviews" value={String(summary.reviewCounts.pending ?? 0)} />
        </section>

        <section className="mt-10" style={primarySectionStyle}>
          <SectionHeader eyebrow="Reviews" title="Customer review moderation" />
          <div style={filterBarStyle} aria-label="Filter reviews by status">
            {REVIEW_STATUS_FILTERS.map((status) => {
              const active = reviewStatusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setReviewStatusFilter(status)}
                  style={{
                    ...filterButtonStyle,
                    borderColor: active ? "#fff" : "#333",
                    background: active ? "#fff" : "#050505",
                    color: active ? "#000" : "#fff",
                  }}
                >
                  {status} ({summary.reviewCounts[status] ?? 0})
                </button>
              );
            })}
          </div>
          <div className="grid gap-3">
            {summary.filteredReviews.map((review) => {
              const productName = productNameFromReview(review);
              const approvedPhotos = (review.product_review_photos || []).filter(
                (photo) => photo.status !== "rejected" && photo.status !== "hidden",
              );
              return (
                <div key={review.id} style={reviewAdminCardStyle}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="jb-eyebrow">{review.status}</div>
                      <div style={{ color: "#fff", fontSize: 16, marginTop: 6 }}>{productName}</div>
                      <div style={{ ...mutedText, marginTop: 4 }}>
                        {review.display_name} · {review.order_id}
                        {review.selected_color ? ` · ${review.selected_color}` : ""}
                        {review.selected_size ? ` · ${review.selected_size}` : ""}
                      </div>
                    </div>
                    <div style={{ color: "#fff", fontSize: 15 }}>
                      {"★".repeat(review.rating)}
                      <span style={{ color: "#444" }}>{"★".repeat(5 - review.rating)}</span>
                    </div>
                  </div>
                  <p style={{ color: "#d8d8d8", lineHeight: 1.6, marginTop: 12 }}>
                    {review.review_text}
                  </p>
                  {approvedPhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-4">
                      {approvedPhotos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.signed_url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            width: 90,
                            height: 90,
                            background: "#141414",
                            display: "block",
                          }}
                        >
                          {photo.signed_url && (
                            <img
                              src={photo.signed_url}
                              alt={`${productName} review`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap mt-4">
                    {review.status !== "approved" && (
                      <button
                        type="button"
                        className="jb-btn-ghost"
                        onClick={() => moderateReview(review.id, "approved")}
                        disabled={moderatingReviewId === review.id}
                        style={{ minHeight: 36, padding: "0 12px" }}
                      >
                        Approve
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button
                        type="button"
                        className="jb-btn-ghost"
                        onClick={() => moderateReview(review.id, "rejected")}
                        disabled={moderatingReviewId === review.id}
                        style={{ minHeight: 36, padding: "0 12px" }}
                      >
                        Reject
                      </button>
                    )}
                    {review.status !== "hidden" && (
                      <button
                        type="button"
                        className="jb-btn-ghost"
                        onClick={() => moderateReview(review.id, "hidden")}
                        disabled={moderatingReviewId === review.id}
                        style={{ minHeight: 36, padding: "0 12px" }}
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {summary.filteredReviews.length === 0 && (
              <div style={{ color: "#9a9a9a", fontSize: 13 }}>No reviews match this filter</div>
            )}
          </div>
        </section>

        <section className="mt-10" style={primarySectionStyle}>
          <SectionHeader eyebrow="Orders" title="Order management" />
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <div className="jb-label">Payment status</div>
              <div style={filterBarStyle} aria-label="Filter orders by payment status">
                {PAYMENT_STATUS_FILTERS.map((status) => {
                  const active = paymentStatusFilter === status;
                  const count =
                    status === "all" ? orders.length : (summary.paymentCounts[status] ?? 0);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updatePaymentFilter(status)}
                      style={{
                        ...filterButtonStyle,
                        borderColor: active ? "#fff" : "#333",
                        background: active ? "#fff" : "#050505",
                        color: active ? "#000" : "#fff",
                      }}
                    >
                      {statusLabel(status)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="jb-label">Order status</div>
              <div style={filterBarStyle} aria-label="Filter orders by order status">
                {ORDER_STATUS_FILTERS.map((status) => {
                  const active = orderStatusFilter === status;
                  const count =
                    status === "all" ? orders.length : (summary.orderCounts[status] ?? 0);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateOrderFilter(status)}
                      style={{
                        ...filterButtonStyle,
                        borderColor: active ? "#fff" : "#333",
                        background: active ? "#fff" : "#050505",
                        color: active ? "#000" : "#fff",
                      }}
                    >
                      {statusLabel(status)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="jb-label" htmlFor="admin-order-search">
              Search orders
            </label>
            <input
              id="admin-order-search"
              value={orderQuery}
              onChange={(event) => {
                setOrderQuery(event.target.value);
                setOrderPage(1);
              }}
              className="jb-input"
              placeholder="Order, customer, phone, product, address"
            />
          </div>
          <div style={tableWrap}>
            <table style={orderTableStyle}>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>What they ordered</Th>
                  <Th>Location</Th>
                  <Th>Payment</Th>
                  <Th>Payment status</Th>
                  <Th>Order status</Th>
                  <Th>Tracking</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Save</Th>
                </tr>
              </thead>
              <tbody>
                {summary.pagedOrders.map((order) => {
                  const draft = orderDrafts[order.order_id] ?? {
                    payment_status: order.payment_status,
                    order_status: order.order_status,
                    tracking_number: order.tracking_number ?? "",
                    payment_reference: order.payment_reference ?? "",
                  };
                  const availableOrderStatuses = getAllowedOrderStatuses(draft.payment_status);
                  const changed =
                    draft.payment_status !== order.payment_status ||
                    draft.order_status !== order.order_status ||
                    draft.tracking_number !== (order.tracking_number ?? "") ||
                    draft.payment_reference !== (order.payment_reference ?? "");
                  return (
                    <tr key={order.order_id} style={rowLine}>
                      <Td>
                        <div style={{ color: "#fff" }}>{order.order_id}</div>
                        <div style={{ ...mutedText, marginTop: 3 }}>
                          {dateLabel(order.created_at)} · {order.total_items ?? 0} item
                          {(order.total_items ?? 0) === 1 ? "" : "s"}
                        </div>
                      </Td>
                      <Td>
                        <div style={{ color: "#fff" }}>
                          {order.customer_name || order.customer_email || "Guest"}
                        </div>
                        <div style={detailText}>{order.customer_phone || "No phone"}</div>
                        <div style={detailText}>{order.customer_email || "No email"}</div>
                      </Td>
                      <Td>
                        {orderSummaryLines(order.order_summary).map((line, index) => (
                          <div key={`${order.order_id}-${index}`} style={{ marginBottom: 4 }}>
                            {line}
                          </div>
                        ))}
                      </Td>
                      <Td>
                        <div style={addressText}>{order.shipping_address || "No address"}</div>
                      </Td>
                      <Td>
                        <div style={{ color: "#fff", marginBottom: 8 }}>
                          {paymentMethodLabel(order.payment_method)}
                        </div>
                        <input
                          value={draft.payment_reference}
                          onChange={(event) =>
                            updateDraft(order.order_id, { payment_reference: event.target.value })
                          }
                          placeholder="Payment ref"
                          style={controlStyle}
                          aria-label={`Payment reference for ${order.order_id}`}
                        />
                      </Td>
                      <Td>
                        <StatusBadge value={draft.payment_status} kind="payment" />
                        {draft.payment_status === "pending" && (
                          <button
                            type="button"
                            className="jb-btn-ghost"
                            onClick={() => markOrderPaid(order.order_id)}
                            disabled={savingOrderId === order.order_id}
                            style={{ minHeight: 32, padding: "0 10px", margin: "8px 0" }}
                          >
                            Mark as paid
                          </button>
                        )}
                        <select
                          value={draft.payment_status}
                          onChange={(event) =>
                            changePaymentStatus(order.order_id, event.target.value as PaymentStatus)
                          }
                          disabled={savingOrderId === order.order_id}
                          style={controlStyle}
                          aria-label={`Payment status for ${order.order_id}`}
                        >
                          {PAYMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <StatusBadge value={draft.order_status} kind="order" />
                        <select
                          value={draft.order_status}
                          onChange={(event) =>
                            changeOrderStatus(order.order_id, event.target.value as OrderStatus)
                          }
                          disabled={savingOrderId === order.order_id}
                          style={{ ...controlStyle, marginTop: 8 }}
                          aria-label={`Order status for ${order.order_id}`}
                        >
                          {availableOrderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <input
                          value={draft.tracking_number}
                          onChange={(event) =>
                            updateDraft(order.order_id, { tracking_number: event.target.value })
                          }
                          placeholder="Tracking"
                          style={controlStyle}
                          aria-label={`Tracking number for ${order.order_id}`}
                        />
                      </Td>
                      <Td align="right">{formatPrice(Number(order.total_price_egp || 0))}</Td>
                      <Td align="right">
                        <button
                          className="jb-btn-ghost inline-flex items-center justify-center"
                          onClick={() => saveOrder(order.order_id)}
                          disabled={!changed || savingOrderId === order.order_id}
                          style={{
                            minHeight: 34,
                            padding: "0 10px",
                            opacity: !changed ? 0.5 : 1,
                          }}
                          aria-label={`Save ${order.order_id}`}
                        >
                          <Save size={14} aria-hidden="true" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
                {summary.filteredOrders.length === 0 && (
                  <tr>
                    <Td colSpan={10}>
                      {orders.length === 0 ? "No orders yet" : "No orders match these filters"}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager
            page={summary.safeOrderPage}
            pageCount={summary.orderPageCount}
            total={summary.filteredOrders.length}
            onPrevious={() => setOrderPage((page) => Math.max(1, page - 1))}
            onNext={() => setOrderPage((page) => Math.min(summary.orderPageCount, page + 1))}
          />
        </section>

        <section className="mt-10">
          <div>
            <SectionHeader eyebrow="Revenue" title="Monthly revenue" />
            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Month</Th>
                    <Th align="right">Revenue</Th>
                    <Th align="right">Paid orders</Th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((row) => (
                    <tr key={row.month_start} style={rowLine}>
                      <Td>{monthLabel(row.month_start)}</Td>
                      <Td align="right">{formatPrice(Number(row.total_revenue_egp || 0))}</Td>
                      <Td align="right">{row.paid_order_count}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader eyebrow="Inventory" title="Manage stock" />
          <div className="mb-4">
            <label className="jb-label" htmlFor="admin-inventory-search">
              Search inventory
            </label>
            <input
              id="admin-inventory-search"
              value={inventoryQuery}
              onChange={(event) => setInventoryQuery(event.target.value)}
              className="jb-input"
              placeholder="Product, color, size, SKU"
            />
          </div>
          <div style={tableWrap}>
            <table style={inventoryTableStyle}>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Color</Th>
                  <Th>Size</Th>
                  <Th>SKU</Th>
                  <Th align="right">Product total</Th>
                  <Th align="right">Stock</Th>
                  <Th align="right">Save</Th>
                </tr>
              </thead>
              <tbody>
                {summary.filteredInventory.map((variant) => {
                  const product = productFromVariant(variant);
                  const draft = stockDrafts[variant.id] ?? String(variant.stock_quantity ?? 0);
                  const changed = draft !== String(variant.stock_quantity ?? 0);
                  return (
                    <tr key={variant.id} style={rowLine}>
                      <Td>
                        <div style={{ color: "#fff" }}>{product?.name || "Product"}</div>
                        <div style={{ ...mutedText, marginTop: 3 }}>
                          {product?.gender || "unisex"} · {product?.sold_out ? "Sold out" : "Live"}
                        </div>
                      </Td>
                      <Td>{variant.color}</Td>
                      <Td>{variant.size}</Td>
                      <Td>{variant.sku || "—"}</Td>
                      <Td align="right">{product?.stock_quantity ?? 0}</Td>
                      <Td align="right">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={draft}
                          onChange={(event) =>
                            setStockDrafts((current) => ({
                              ...current,
                              [variant.id]: event.target.value,
                            }))
                          }
                          style={{ ...controlStyle, minWidth: 90, textAlign: "right" }}
                          aria-label={`Stock for ${product?.name || "product"} ${variant.color} ${variant.size}`}
                        />
                      </Td>
                      <Td align="right">
                        <button
                          className="jb-btn-ghost inline-flex items-center justify-center"
                          onClick={() => saveStock(variant.id)}
                          disabled={!changed || savingVariantId === variant.id}
                          style={{
                            minHeight: 34,
                            padding: "0 10px",
                            opacity: !changed ? 0.5 : 1,
                          }}
                          aria-label={`Save stock for ${variant.color} ${variant.size}`}
                        >
                          <Save size={14} aria-hidden="true" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
                {summary.filteredInventory.length === 0 && (
                  <tr>
                    <Td colSpan={7}>
                      {inventory.length === 0 ? "No inventory yet" : "No inventory matches search"}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </AdminShell>
    </Layout>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #262626", padding: 18, minHeight: 112 }}>
      <div className="jb-eyebrow">{label}</div>
      <div style={{ color: "#fff", fontSize: 24, marginTop: 12, fontWeight: 300 }}>{value}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="jb-eyebrow">{eyebrow}</div>
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 400, marginTop: 6 }}>{title}</h2>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap" style={mutedText}>
      <span>
        Page {page} of {pageCount} · {total} orders
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="jb-btn-ghost"
          onClick={onPrevious}
          disabled={page <= 1}
          style={{ minHeight: 36, padding: "0 12px" }}
        >
          Previous
        </button>
        <button
          type="button"
          className="jb-btn-ghost"
          onClick={onNext}
          disabled={page >= pageCount}
          style={{ minHeight: 36, padding: "0 12px" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th style={{ ...cellBase, ...headCell, textAlign: align }}>{children}</th>;
}

function Td({
  children,
  align = "left",
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} style={{ ...cellBase, textAlign: align }}>
      {children}
    </td>
  );
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function paymentMethodLabel(value: string | null) {
  if (value === "cod") return "Cash on delivery";
  if (value === "instapay") return "InstaPay";
  return value || "Not set";
}

function statusLabel(status: string) {
  if (status === "needs_action") return "needs action";
  if (status === "cod_pending") return "COD pending";
  return status;
}

function orderNeedsAction(order: AdminOrderRow) {
  return (
    order.payment_status === "pending" ||
    order.payment_status === "failed" ||
    (order.payment_status === "paid" &&
      order.order_status !== "delivered" &&
      !order.tracking_number) ||
    (order.payment_status === "cod_pending" && order.order_status === "delivered")
  );
}

function getAllowedOrderStatuses(paymentStatus: PaymentStatus) {
  if (paymentStatus === "pending")
    return ORDER_STATUSES.filter(
      (status) =>
        status !== "confirmed" &&
        status !== "processing" &&
        status !== "shipped" &&
        status !== "delivered",
    );
  return ORDER_STATUSES;
}

function StatusBadge({ value, kind }: { value: string; kind: "payment" | "order" }) {
  const palette =
    kind === "payment"
      ? paymentBadgePalette(value as PaymentStatus)
      : orderBadgePalette(value as OrderStatus);
  return <span style={{ ...badgeStyle, ...palette }}>{statusLabel(value)}</span>;
}

function paymentBadgePalette(status: PaymentStatus) {
  if (status === "paid") return { borderColor: "#72d38a", color: "#b6f2c5", background: "#07150b" };
  if (status === "pending")
    return { borderColor: "#e7c75f", color: "#f4dda0", background: "#171203" };
  if (status === "cod_pending")
    return { borderColor: "#7fb5ff", color: "#bdd9ff", background: "#06111f" };
  if (status === "refunded")
    return { borderColor: "#c69cff", color: "#dfccff", background: "#12091d" };
  return { borderColor: "#ff8f8f", color: "#ffc6c6", background: "#1d0707" };
}

function orderBadgePalette(status: OrderStatus) {
  if (status === "delivered")
    return { borderColor: "#72d38a", color: "#b6f2c5", background: "#07150b" };
  if (status === "shipped" || status === "processing")
    return { borderColor: "#7fb5ff", color: "#bdd9ff", background: "#06111f" };
  if (status === "confirmed")
    return { borderColor: "#e7c75f", color: "#f4dda0", background: "#171203" };
  if (status === "cancelled")
    return { borderColor: "#ff8f8f", color: "#ffc6c6", background: "#1d0707" };
  return { borderColor: "#777", color: "#ddd", background: "#101010" };
}

function orderMatchesQuery(order: AdminOrderRow, query: string) {
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

function inventoryMatchesQuery(variant: AdminInventoryRow, query: string) {
  const product = productFromVariant(variant);
  return [product?.name, product?.gender, variant.color, variant.size, variant.sku]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function orderSummaryLines(value: string | null) {
  const lines = (value || "")
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : ["No item details"];
}

function productFromVariant(variant: AdminInventoryRow) {
  return Array.isArray(variant.item) ? variant.item[0] : variant.item;
}

function productNameFromReview(review: ProductReview) {
  const item = Array.isArray(review.item) ? review.item[0] : review.item;
  return item?.name || "Product";
}

function sortInventory(rows: AdminInventoryRow[]) {
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

const pageTitle = {
  color: "#fff",
  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
  fontWeight: 300,
  marginTop: 6,
};

const mutedText = {
  color: "#9a9a9a",
  fontSize: 13,
};

const tableWrap = {
  border: "1px solid #262626",
  overflowX: "auto" as const,
};

const primarySectionStyle = {
  border: "1px solid #262626",
  padding: 18,
};

const reviewAdminCardStyle = {
  border: "1px solid #262626",
  padding: 16,
  background: "#050505",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 880,
};

const orderTableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 1280,
};

const inventoryTableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 980,
};

const cellBase = {
  padding: "14px 16px",
  color: "#fff",
  fontSize: 13,
  verticalAlign: "top" as const,
  lineHeight: 1.45,
};

const detailText = {
  ...mutedText,
  marginTop: 3,
  overflowWrap: "anywhere" as const,
};

const addressText = {
  color: "#d8d8d8",
  maxWidth: 220,
  lineHeight: 1.45,
  overflowWrap: "anywhere" as const,
};

const headCell = {
  color: "#9a9a9a",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  fontWeight: 400,
  borderBottom: "1px solid #262626",
};

const rowLine = {
  borderBottom: "1px solid #161616",
};

const filterBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
  gap: 8,
  marginBottom: 14,
  width: "100%",
};

const filterButtonStyle = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #333",
  padding: "0 8px",
  fontSize: 12,
  textTransform: "capitalize" as const,
  whiteSpace: "nowrap" as const,
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  border: "1px solid",
  padding: "0 8px",
  fontSize: 11,
  textTransform: "capitalize" as const,
  whiteSpace: "nowrap" as const,
};

const controlStyle = {
  width: "100%",
  minWidth: 130,
  minHeight: 36,
  background: "#050505",
  color: "#fff",
  border: "1px solid #262626",
  padding: "0 10px",
  fontSize: 12,
};
