import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { formatPrice, supabase } from "@/lib/supabase";

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
  total_items: number | null;
  total_price_egp: number | null;
  status: string;
  tracking_number: string | null;
  payment_reference: string | null;
  created_at: string | null;
};

type OrderDraft = {
  status: string;
  tracking_number: string;
  payment_reference: string;
};

const ORDER_STATUSES = ["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"];

function AdminPage() {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = async (clearNotice = true) => {
    setError(null);
    if (clearNotice) setNotice(null);
    setLoadingData(true);
    const [revenueResult, ordersResult] = await Promise.all([
      supabase
        .from("revenue")
        .select("month_start,total_revenue_egp,paid_order_count")
        .order("month_start", { ascending: true }),
      supabase
        .from("combined_orders")
        .select(
          "order_id,customer_name,customer_email,total_items,total_price_egp,status,tracking_number,payment_reference,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setLoadingData(false);

    if (revenueResult.error || ordersResult.error) {
      setError(revenueResult.error?.message || ordersResult.error?.message || "Admin data failed");
      return;
    }

    setRevenue((revenueResult.data as RevenueRow[]) || []);
    const nextOrders = (ordersResult.data as AdminOrderRow[]) || [];
    setOrders(nextOrders);
    setOrderDrafts(
      Object.fromEntries(
        nextOrders.map((order) => [
          order.order_id,
          {
            status: order.status,
            tracking_number: order.tracking_number ?? "",
            payment_reference: order.payment_reference ?? "",
          },
        ]),
      ),
    );
  };

  const updateDraft = (orderId: string, patch: Partial<OrderDraft>) => {
    setOrderDrafts((current) => ({
      ...current,
      [orderId]: {
        status: current[orderId]?.status ?? "pending",
        tracking_number: current[orderId]?.tracking_number ?? "",
        payment_reference: current[orderId]?.payment_reference ?? "",
        ...patch,
      },
    }));
  };

  const saveOrder = async (orderId: string) => {
    const draft = orderDrafts[orderId];
    if (!draft) return;

    setError(null);
    setNotice(null);
    setSavingOrderId(orderId);
    const { error: updateError } = await supabase.rpc("admin_update_order", {
      p_order_id: orderId,
      p_status: draft.status,
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!adminLoading && isAdmin) loadAdminData();
  }, [user, loading, adminLoading, isAdmin, navigate]);

  const summary = useMemo(() => {
    const totalRevenue = revenue.reduce((sum, row) => sum + Number(row.total_revenue_egp || 0), 0);
    const paidOrders = revenue.reduce((sum, row) => sum + Number(row.paid_order_count || 0), 0);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonth = revenue.find((row) => row.month_start.slice(0, 7) === currentMonthKey);
    const bestMonth = [...revenue].sort(
      (a, b) => Number(b.total_revenue_egp || 0) - Number(a.total_revenue_egp || 0),
    )[0];

    return { totalRevenue, paidOrders, currentMonth, bestMonth };
  }, [revenue]);

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
          <button className="jb-btn-ghost inline-flex items-center gap-2" onClick={loadAdminData}>
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
        </section>

        <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8 mt-10">
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

          <div>
            <SectionHeader eyebrow="Orders" title="Manage recent orders" />
            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Status</Th>
                    <Th>Tracking</Th>
                    <Th>Payment ref</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Save</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const draft = orderDrafts[order.order_id] ?? {
                      status: order.status,
                      tracking_number: order.tracking_number ?? "",
                      payment_reference: order.payment_reference ?? "",
                    };
                    const changed =
                      draft.status !== order.status ||
                      draft.tracking_number !== (order.tracking_number ?? "") ||
                      draft.payment_reference !== (order.payment_reference ?? "");
                    return (
                      <tr key={order.order_id} style={rowLine}>
                        <Td>
                          <div style={{ color: "#fff" }}>{order.order_id}</div>
                          <div style={{ ...mutedText, marginTop: 3 }}>
                            {order.customer_name || order.customer_email || "Guest"} ·{" "}
                            {dateLabel(order.created_at)}
                          </div>
                        </Td>
                        <Td>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateDraft(order.order_id, { status: event.target.value })
                            }
                            style={controlStyle}
                            aria-label={`Status for ${order.order_id}`}
                          >
                            {ORDER_STATUSES.map((status) => (
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
                        <Td>
                          <input
                            value={draft.payment_reference}
                            onChange={(event) =>
                              updateDraft(order.order_id, { payment_reference: event.target.value })
                            }
                            placeholder="Reference"
                            style={controlStyle}
                            aria-label={`Payment reference for ${order.order_id}`}
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
                  {orders.length === 0 && (
                    <tr>
                      <Td colSpan={6}>No orders yet</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 880,
};

const cellBase = {
  padding: "14px 16px",
  color: "#fff",
  fontSize: 13,
  verticalAlign: "top" as const,
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
