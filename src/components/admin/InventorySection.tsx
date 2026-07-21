import { Save } from "lucide-react";
import { productFromVariant } from "@/components/admin/admin-utils";
import { Pager, SectionCard } from "@/components/admin/AdminUi";
import type { DashboardSummary } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventorySectionProps {
  inventoryCount: number;
  summary: DashboardSummary;
  query: string;
  stockDrafts: Record<string, string>;
  savingVariantId: string | null;
  onQueryChange: (query: string) => void;
  onDraftChange: (variantId: string, stock: string) => void;
  onSave: (variantId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function InventorySection({
  inventoryCount,
  summary,
  query,
  stockDrafts,
  savingVariantId,
  onQueryChange,
  onDraftChange,
  onSave,
  onPrevious,
  onNext,
}: InventorySectionProps) {
  return (
    <SectionCard eyebrow="Inventory" title="Manage stock">
      <div className="mb-5 max-w-lg space-y-2">
        <Label htmlFor="admin-inventory-search">Search inventory</Label>
        <Input
          id="admin-inventory-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Product, color, size, SKU"
        />
      </div>
      <div className="border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Product total</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.pagedInventory.map((variant) => {
              const product = productFromVariant(variant);
              const draft = stockDrafts[variant.id] ?? String(variant.stock_quantity ?? 0);
              const changed = draft !== String(variant.stock_quantity ?? 0);
              return (
                <TableRow key={variant.id}>
                  <TableCell>
                    <div>{product?.name || "Product"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {product?.gender || "unisex"} · {product?.sold_out ? "Sold out" : "Live"}
                    </div>
                  </TableCell>
                  <TableCell>{variant.color}</TableCell>
                  <TableCell>{variant.size}</TableCell>
                  <TableCell>{variant.sku || "—"}</TableCell>
                  <TableCell className="text-right">{product?.stock_quantity ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={draft}
                      onChange={(event) => onDraftChange(variant.id, event.target.value)}
                      className="ml-auto w-24 text-right"
                      aria-label={`Stock for ${product?.name || "product"} ${variant.color} ${variant.size}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onSave(variant.id)}
                      disabled={!changed || savingVariantId === variant.id}
                      aria-label={`Save stock for ${variant.color} ${variant.size}`}
                    >
                      <Save aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {summary.filteredInventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {inventoryCount === 0 ? "No inventory yet" : "No inventory matches search"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pager
        page={summary.safeInventoryPage}
        pageCount={summary.inventoryPageCount}
        total={summary.filteredInventory.length}
        itemLabel="items"
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </SectionCard>
  );
}
