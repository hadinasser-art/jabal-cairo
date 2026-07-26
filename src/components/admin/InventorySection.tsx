import { Save } from "lucide-react";
import { productFromVariant } from "@/components/admin/admin-utils";
import { EmptyState, Pager, SearchField, Section } from "@/components/admin/AdminUi";
import type { AdminInventoryRow, DashboardSummary } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 3;

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
  const empty = summary.filteredInventory.length === 0;

  return (
    <Section
      eyebrow="Inventory"
      title="Manage stock"
      description="Edit a variant's stock, then save that row."
      bodyClassName="p-0"
    >
      <div className="border-b p-5 sm:p-6">
        <SearchField
          id="admin-inventory-search"
          label="Search inventory"
          value={query}
          placeholder="Product, color, size, SKU"
          onChange={onQueryChange}
          className="max-w-lg"
        />
      </div>

      {empty ? (
        <EmptyState
          title={inventoryCount === 0 ? "No inventory yet" : "No inventory matches this search"}
          description={
            inventoryCount === 0
              ? "Variants appear here once products have colors and sizes."
              : "Try a different product, color, size or SKU."
          }
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="w-32 text-end">Stock</TableHead>
                  <TableHead className="w-16 text-end">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.pagedInventory.map((variant) => {
                  const product = productFromVariant(variant);
                  return (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <div className="truncate">{product?.name || "Product"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {variantMeta(variant)}
                        </div>
                      </TableCell>
                      <TableCell>{variant.color}</TableCell>
                      <TableCell>{variant.size}</TableCell>
                      <TableCell className="text-muted-foreground">{variant.sku || "—"}</TableCell>
                      <TableCell className="text-end">
                        <StockInput
                          variant={variant}
                          draft={draftFor(variant, stockDrafts)}
                          onDraftChange={onDraftChange}
                          className="ms-auto w-24"
                        />
                      </TableCell>
                      <TableCell className="text-end">
                        <SaveStockButton
                          variant={variant}
                          draft={draftFor(variant, stockDrafts)}
                          saving={savingVariantId === variant.id}
                          onSave={onSave}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="lg:hidden">
            {summary.pagedInventory.map((variant) => {
              const product = productFromVariant(variant);
              return (
                <li key={variant.id} className="border-b p-5 last:border-b-0 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{product?.name || "Product"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{variantMeta(variant)}</p>
                    </div>
                    <p className="shrink-0 text-sm">
                      {variant.color} · {variant.size}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">SKU {variant.sku || "—"}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <StockInput
                      variant={variant}
                      draft={draftFor(variant, stockDrafts)}
                      onDraftChange={onDraftChange}
                      className="w-28"
                    />
                    <SaveStockButton
                      variant={variant}
                      draft={draftFor(variant, stockDrafts)}
                      saving={savingVariantId === variant.id}
                      onSave={onSave}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Pager
          page={summary.safeInventoryPage}
          pageCount={summary.inventoryPageCount}
          total={summary.filteredInventory.length}
          itemLabel="items"
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
    </Section>
  );
}

function draftFor(variant: AdminInventoryRow, drafts: Record<string, string>) {
  return drafts[variant.id] ?? String(variant.stock_quantity ?? 0);
}

function variantMeta(variant: AdminInventoryRow) {
  const product = productFromVariant(variant);
  return `${product?.gender || "unisex"} · ${product?.sold_out ? "Sold out" : "Live"} · ${product?.stock_quantity ?? 0} in total`;
}

function StockInput({
  variant,
  draft,
  className,
  onDraftChange,
}: {
  variant: AdminInventoryRow;
  draft: string;
  className?: string;
  onDraftChange: (variantId: string, stock: string) => void;
}) {
  const product = productFromVariant(variant);
  const low = variant.stock_quantity > 0 && variant.stock_quantity <= LOW_STOCK_THRESHOLD;
  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={draft}
      onChange={(event) => onDraftChange(variant.id, event.target.value)}
      className={cn("text-end tabular-nums", low && "border-[#e7c75f]", className)}
      aria-label={`Stock for ${product?.name || "product"} ${variant.color} ${variant.size}`}
    />
  );
}

function SaveStockButton({
  variant,
  draft,
  saving,
  onSave,
}: {
  variant: AdminInventoryRow;
  draft: string;
  saving: boolean;
  onSave: (variantId: string) => void;
}) {
  const changed = draft !== String(variant.stock_quantity ?? 0);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => onSave(variant.id)}
      disabled={!changed || saving}
      aria-label={`Save stock for ${variant.color} ${variant.size}`}
    >
      <Save aria-hidden="true" />
    </Button>
  );
}
