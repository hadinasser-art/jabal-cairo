import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminGate, AdminLayout, type AdminNavCounts } from "@/components/admin/AdminLayout";
import { Panel } from "@/components/admin/AdminUi";
import { InventorySection } from "@/components/admin/InventorySection";
import { OrdersSection } from "@/components/admin/OrdersSection";
import { OverviewSection } from "@/components/admin/OverviewSection";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { RevenueSection } from "@/components/admin/RevenueSection";
import { ReviewsSection } from "@/components/admin/ReviewsSection";
import type { AdminSection } from "@/components/admin/types";
import { useAdminDashboard } from "@/components/admin/useAdminDashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — JABAL" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  const admin = useAdminDashboard(isAdmin);
  const [section, setSection] = useState<AdminSection>("overview");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || adminLoading) {
    return (
      <AdminGate>
        <p className="text-center text-sm text-muted-foreground">Loading dashboard…</p>
      </AdminGate>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <AdminGate>
        <Panel className="p-6">
          <p className="jb-eyebrow">Admin</p>
          <h1 className="mt-2 text-2xl font-light">Access required</h1>
          <p className="mt-4 text-sm text-muted-foreground">Signed in as {user.email}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/account">Back to account</Link>
          </Button>
        </Panel>
      </AdminGate>
    );
  }

  const counts: AdminNavCounts = {
    orders: admin.summary.paymentCounts.needs_action ?? 0,
    inventory: admin.summary.lowStock.length,
    reviews: admin.summary.reviewCounts.pending ?? 0,
  };

  const openOrders = (query?: string) => {
    setSection("orders");
    if (query !== undefined) {
      admin.setOrderQuery(query);
      admin.setOrderPage(1);
    }
  };

  const openInventory = (query?: string) => {
    setSection("inventory");
    if (query !== undefined) {
      admin.setInventoryQuery(query);
      admin.setInventoryPage(1);
    }
  };

  return (
    <AdminLayout
      section={section}
      counts={counts}
      email={user.email ?? ""}
      refreshing={admin.loadingData}
      onSectionChange={setSection}
      onRefresh={() => void admin.loadAdminData()}
    >
      {admin.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{admin.error}</AlertDescription>
        </Alert>
      )}
      {admin.notice && (
        <Alert className="mb-6">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{admin.notice}</AlertDescription>
        </Alert>
      )}

      {section === "overview" && (
        <OverviewSection
          orders={admin.orders}
          inventoryCount={admin.inventory.length}
          summary={admin.summary}
          onOpenOrders={openOrders}
          onOpenInventory={openInventory}
        />
      )}

      {section === "orders" && (
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
      )}

      {section === "inventory" && (
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
            admin.setInventoryPage((page) => Math.min(admin.summary.inventoryPageCount, page + 1))
          }
        />
      )}

      {section === "photos" && (
        <PhotoManager
          products={admin.products}
          inventory={admin.inventory}
          media={admin.media}
          onProductsChange={admin.setProducts}
          onInventoryChange={admin.setInventory}
          onMediaChange={admin.setMedia}
          onNotice={admin.setNotice}
          onError={admin.setError}
        />
      )}

      {section === "reviews" && (
        <ReviewsSection
          summary={admin.summary}
          status={admin.reviewStatusFilter}
          moderatingReviewId={admin.moderatingReviewId}
          onStatusChange={admin.setReviewStatusFilter}
          onModerate={(reviewId, status, rejectedPhotoIds) =>
            void admin.moderateReview(reviewId, status, rejectedPhotoIds)
          }
        />
      )}

      {section === "revenue" && <RevenueSection revenue={admin.revenue} />}
    </AdminLayout>
  );
}
