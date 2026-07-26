import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ImagePlus, Loader2, Plus } from "lucide-react";
import { ColorGroupList } from "@/components/admin/ColorGroupList";
import { MediaAssetCard } from "@/components/admin/MediaAssetCard";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { Section } from "@/components/admin/AdminUi";
import { useColorGroups } from "@/components/admin/useColorGroups";
import { usePhotoMutations } from "@/components/admin/usePhotoMutations";
import { useProductAssets } from "@/components/admin/useProductAssets";
import type { AdminInventoryRow, AdminMediaRow, AdminProductRow } from "@/components/admin/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhotoManagerProps {
  products: AdminProductRow[];
  inventory: AdminInventoryRow[];
  media: AdminMediaRow[];
  onProductsChange: Dispatch<SetStateAction<AdminProductRow[]>>;
  onInventoryChange: Dispatch<SetStateAction<AdminInventoryRow[]>>;
  onMediaChange: Dispatch<SetStateAction<AdminMediaRow[]>>;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

export function PhotoManager({
  products,
  inventory,
  media,
  onProductsChange,
  onInventoryChange,
  onMediaChange,
  onNotice,
  onError,
}: PhotoManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState("");

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || products[0] || null;

  const productMedia = useMemo(
    () =>
      media
        .filter((row) => row.item_id === selectedProduct?.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [media, selectedProduct?.id],
  );
  const productVariants = useMemo(
    () => inventory.filter((variant) => variant.item_id === selectedProduct?.id),
    [inventory, selectedProduct?.id],
  );
  const colors = useMemo(() => {
    const configured = selectedProduct?.color_order || [];
    const mediaColors = productMedia
      .map((row) => row.color)
      .filter((color): color is string => !!color && !configured.includes(color));
    const variantColors = productVariants.map((variant) => variant.color);
    return Array.from(new Set([...configured, ...mediaColors, ...variantColors]));
  }, [productMedia, productVariants, selectedProduct?.color_order]);

  const photos = usePhotoMutations({
    media,
    productMedia,
    selectedProductId: selectedProduct?.id ?? null,
    onMediaChange,
    onNotice,
    onError,
  });

  const groups = useColorGroups({
    products,
    inventory,
    media,
    colors,
    selectedProduct,
    productMedia,
    productVariants,
    onProductsChange,
    onInventoryChange,
    onMediaChange,
    onNotice,
    onError,
  });

  const assets = useProductAssets({
    products,
    selectedProduct,
    onProductsChange,
    onNotice,
    onError,
  });

  return (
    <Section
      eyebrow="Photos"
      title="Product photography"
      description="Changes autosave. Drag to reorder, or use the move buttons for keyboard and touch."
      actions={
        <ProductPicker
          products={products}
          selectedProductId={selectedProduct?.id || ""}
          onSelect={setSelectedProductId}
        />
      }
    >
      {!selectedProduct ? (
        <Alert>
          <ImagePlus aria-hidden="true" />
          <AlertTitle>No products yet</AlertTitle>
          <AlertDescription>Add a product before managing photography.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <div>
            <Badge variant="outline" className="capitalize">
              {selectedProduct.gender || "unisex"}
            </Badge>
            <h3 className="mt-2.5 text-xl font-light">{selectedProduct.name}</h3>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MediaAssetCard
              title="Main image"
              description="Primary product image used across cards and product pages."
              imageUrl={selectedProduct.image_url}
              imageAlt={`${selectedProduct.name} main`}
              busy={assets.assetBusy === "image_url"}
              onUpload={(file) => void assets.updateAsset("image_url", file)}
              onRemove={() => void assets.removeAsset("image_url")}
            />
            <MediaAssetCard
              title="Size chart"
              description="Reference image shown to shoppers while selecting a size."
              imageUrl={selectedProduct.size_chart_url}
              imageAlt={`${selectedProduct.name} size chart`}
              busy={assets.assetBusy === "size_chart_url"}
              onUpload={(file) => void assets.updateAsset("size_chart_url", file)}
              onRemove={() => void assets.removeAsset("size_chart_url")}
            />
          </div>

          <div className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-color">Add a color group</Label>
              <Input
                id="new-color"
                value={groups.newColor}
                onChange={(event) => groups.setNewColor(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void groups.addColor();
                }}
                placeholder="e.g. Forest Green"
              />
            </div>
            <Button
              type="button"
              onClick={() => void groups.addColor()}
              disabled={groups.colorBusy !== null}
            >
              {groups.colorBusy === "order" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              Add color
            </Button>
          </div>

          <ColorGroupList
            colors={colors}
            productMedia={productMedia}
            productVariants={productVariants}
            photos={photos}
            groups={groups}
          />
        </div>
      )}
    </Section>
  );
}
