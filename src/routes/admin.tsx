import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { AdminShell, Metric } from "@/components/admin/AdminUi";
import { InventorySection } from "@/components/admin/InventorySection";
import { OrdersSection } from "@/components/admin/OrdersSection";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { RevenueSection } from "@/components/admin/RevenueSection";
import { ReviewsSection } from "@/components/admin/ReviewsSection";
import { monthLabel } from "@/components/admin/admin-utils";
import { useAdminDashboard } from "@/components/admin/useAdminDashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — JABAL" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const admin = useAdminDashboard(isAdmin);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || adminLoading) {
    return (
      <Layout>
        <AdminShell>
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </AdminShell>
      </Layout>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <Layout>
        <AdminShell>
          <Card className="max-w-lg rounded-none bg-background shadow-none">
            <CardHeader>
              <p className="jb-eyebrow">Admin</p>
              <CardTitle className="text-2xl font-light">Access required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
              <Button asChild variant="outline">
                <Link to="/account">Account</Link>
              </Button>
            </CardContent>
          </Card>
        </AdminShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <AdminShell>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="jb-eyebrow">Admin</p>
            <h1 className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void admin.loadAdminData()}
            disabled={admin.loadingData}
          >
            <RefreshCw
              className={admin.loadingData ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            {admin.loadingData ? "Refreshing" : "Refresh"}
          </Button>
        </div>

        {admin.error && (
          <Alert variant="destructive" className="mt-6 rounded-none">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{admin.error}</AlertDescription>
          </Alert>
        )}
        {admin.notice && (
          <Alert className="mt-6 rounded-none">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{admin.notice}</AlertDescription>
          </Alert>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total revenue" value={formatPrice(admin.summary.totalRevenue)} />
          <Metric label="Paid orders" value={String(admin.summary.paidOrders)} />
          <Metric
            label="This month"
            value={formatPrice(Number(admin.summary.currentMonth?.total_revenue_egp || 0))}
          />
          <Metric
            label="Best month"
            value={
              admin.summary.bestMonth
                ? `${monthLabel(admin.summary.bestMonth.month_start)} · ${formatPrice(Number(admin.summary.bestMonth.total_revenue_egp || 0))}`
                : "—"
            }
          />
          <Metric label="Stock units" value={String(admin.summary.totalStock)} />
          <Metric label="Low stock" value={String(admin.summary.lowStock.length)} />
          <Metric
            label="Needs action"
            value={String(admin.summary.paymentCounts.needs_action ?? 0)}
          />
          <Metric label="Pending reviews" value={String(admin.summary.reviewCounts.pending ?? 0)} />
        </section>

        <Tabs defaultValue="reviews" className="mt-8">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-muted/40 p-1">
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-4">
            <ReviewsSection
              summary={admin.summary}
              status={admin.reviewStatusFilter}
              moderatingReviewId={admin.moderatingReviewId}
              onStatusChange={admin.setReviewStatusFilter}
              onModerate={(reviewId, status, rejectedPhotoIds) =>
                void admin.moderateReview(reviewId, status, rejectedPhotoIds)
              }
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <OrdersSection
              orders={admin.orders}
              summary={admin.summary}
              orderDrafts={admin.orderDrafts}
              paymentStatusFilter={admin.paymentStatusFilter}
              orderStatusFilter={admin.orderStatusFilter}
              query={admin.orderQuery}
              savingOrderId={admin.savingOrderId}
              onPaymentFilterChange={admin.updatePaymentFilter}
              onOrderFilterChange={admin.updateOrderFilter}
              onQueryChange={(query) => {
                admin.setOrderQuery(query);
                admin.setOrderPage(1);
              }}
              onDraftChange={admin.updateDraft}
              onPaymentStatusChange={admin.changePaymentStatus}
              onOrderStatusChange={admin.changeOrderStatus}
              onSave={(orderId) => void admin.saveOrder(orderId)}
              onPrevious={() => admin.setOrderPage((page) => Math.max(1, page - 1))}
              onNext={() =>
                admin.setOrderPage((page) => Math.min(admin.summary.orderPageCount, page + 1))
              }
            />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <RevenueSection revenue={admin.revenue} />
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            <InventorySection
              inventoryCount={admin.inventory.length}
              summary={admin.summary}
              query={admin.inventoryQuery}
              stockDrafts={admin.stockDrafts}
              savingVariantId={admin.savingVariantId}
              onQueryChange={(query) => {
                admin.setInventoryQuery(query);
                admin.setInventoryPage(1);
              }}
              onDraftChange={(variantId, stock) =>
                admin.setStockDrafts((current) => ({ ...current, [variantId]: stock }))
              }
              onSave={(variantId) => void admin.saveStock(variantId)}
              onPrevious={() => admin.setInventoryPage((page) => Math.max(1, page - 1))}
              onNext={() =>
                admin.setInventoryPage((page) =>
                  Math.min(admin.summary.inventoryPageCount, page + 1),
                )
              }
            />
          </TabsContent>

          <TabsContent value="photos" className="mt-4">
            <PhotoManager
              products={admin.products}
              media={admin.media}
              onProductsChange={admin.setProducts}
              onMediaChange={admin.setMedia}
              onNotice={admin.setNotice}
              onError={admin.setError}
            />
          </TabsContent>
        </Tabs>
      </AdminShell>
    </Layout>
  );
}
