import { useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { moveInArray } from "@/components/admin/admin-utils";
import { removeProductFiles } from "@/components/admin/photo-storage";
import type { AdminInventoryRow, AdminMediaRow, AdminProductRow } from "@/components/admin/types";
import { SIZE_ORDER, supabase } from "@/lib/supabase";

type CreatedVariant = {
  variant_id: string;
  item_id: string;
  color: string;
  size: string;
  stock_quantity: number;
  sku: string | null;
  updated_at: string | null;
};

interface UseColorGroupsOptions {
  products: AdminProductRow[];
  inventory: AdminInventoryRow[];
  media: AdminMediaRow[];
  /** Ordered color names for the selected product. */
  colors: string[];
  selectedProduct: AdminProductRow | null;
  productMedia: AdminMediaRow[];
  productVariants: AdminInventoryRow[];
  onProductsChange: Dispatch<SetStateAction<AdminProductRow[]>>;
  onInventoryChange: Dispatch<SetStateAction<AdminInventoryRow[]>>;
  onMediaChange: Dispatch<SetStateAction<AdminMediaRow[]>>;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

/** Create, rename, reorder and delete the color groups a product's photos hang off. */
export function useColorGroups({
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
}: UseColorGroupsOptions) {
  const [newColor, setNewColor] = useState("");
  const [colorBusy, setColorBusy] = useState<string | null>(null);
  const [draggedColor, setDraggedColor] = useState<string | null>(null);

  const persistColorOrder = async (nextColors: string[], successMessage = "Color order saved") => {
    if (!selectedProduct) return false;
    const previousProducts = products;
    onProductsChange(
      products.map((product) =>
        product.id === selectedProduct.id ? { ...product, color_order: nextColors } : product,
      ),
    );
    setColorBusy("order");
    const { error } = await supabase.rpc("admin_reorder_product_colors", {
      p_item_id: selectedProduct.id,
      p_color_order: nextColors.length ? nextColors : null,
    });
    setColorBusy(null);
    if (error) {
      onProductsChange(previousProducts);
      onError(error.message);
      return false;
    }
    onNotice(successMessage);
    return true;
  };

  const moveColor = (color: string, direction: -1 | 1) => {
    const from = colors.indexOf(color);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= colors.length) return;
    void persistColorOrder(moveInArray(colors, from, to));
  };

  const startColorDrag = (event: DragEvent<HTMLButtonElement>, color: string) => {
    event.stopPropagation();
    setDraggedColor(color);
    event.dataTransfer.effectAllowed = "move";
  };

  const dropColor = (event: DragEvent<HTMLDivElement>, targetColor: string) => {
    event.preventDefault();
    if (!draggedColor || draggedColor === targetColor) return;
    const from = colors.indexOf(draggedColor);
    const to = colors.indexOf(targetColor);
    setDraggedColor(null);
    if (from < 0 || to < 0) return;
    void persistColorOrder(moveInArray(colors, from, to));
  };

  const addColor = async () => {
    const color = newColor.trim();
    if (!color) {
      onError("Type a color name first");
      return;
    }
    if (colors.some((existing) => existing.toLowerCase() === color.toLowerCase())) {
      onError("That color group already exists");
      return;
    }
    if (!(await persistColorOrder([...colors, color], `${color} added`)) || !selectedProduct)
      return;
    setNewColor("");

    setColorBusy(color);
    const { data, error } = await supabase.rpc("admin_create_product_variants", {
      p_item_id: selectedProduct.id,
      p_color: color,
      p_sizes: [...SIZE_ORDER],
    });
    setColorBusy(null);
    if (error) {
      onError(
        `${color} was added, but sizes could not be created automatically: ${error.message}. Add stock for it from the Inventory tab.`,
      );
      return;
    }
    const created: AdminInventoryRow[] = ((data as CreatedVariant[] | null) || []).map((row) => ({
      id: row.variant_id,
      item_id: row.item_id,
      color: row.color,
      size: row.size,
      stock_quantity: row.stock_quantity,
      sku: row.sku,
      updated_at: row.updated_at,
      item: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        gender: selectedProduct.gender,
        stock_quantity: null,
        sold_out: null,
      },
    }));
    onInventoryChange((current) => [
      ...current.filter((row) => !(row.item_id === selectedProduct.id && row.color === color)),
      ...created,
    ]);
    onNotice(
      `${color} added with sizes ${SIZE_ORDER.join(", ")} at 0 stock. Set stock in the Inventory tab to make it purchasable.`,
    );
  };

  const renameColor = async (oldColor: string, nextName: string) => {
    if (!selectedProduct) return false;
    const nextColor = nextName.trim();
    if (!nextColor) {
      onError("Color name is required");
      return false;
    }
    if (
      colors.some((color) => color !== oldColor && color.toLowerCase() === nextColor.toLowerCase())
    ) {
      onError("That color group already exists");
      return false;
    }
    if (nextColor === oldColor) return true;

    const previousProducts = products;
    const previousMedia = media;
    const nextOrder = colors.map((color) => (color === oldColor ? nextColor : color));
    onProductsChange(
      products.map((product) =>
        product.id === selectedProduct.id ? { ...product, color_order: nextOrder } : product,
      ),
    );
    onMediaChange(
      media.map((row) =>
        row.item_id === selectedProduct.id && row.color === oldColor
          ? { ...row, color: nextColor }
          : row,
      ),
    );
    setColorBusy(oldColor);
    const { error } = await supabase.rpc("admin_rename_product_media_color", {
      p_item_id: selectedProduct.id,
      p_old_color: oldColor,
      p_new_color: nextColor,
      p_color_order: nextOrder,
    });
    setColorBusy(null);
    if (error) {
      onProductsChange(previousProducts);
      onMediaChange(previousMedia);
      onError(error.message);
      return false;
    }
    onNotice(`${oldColor} renamed to ${nextColor}`);
    return true;
  };

  const deleteColorGroup = async (color: string) => {
    if (!selectedProduct) return;
    const rows = productMedia.filter((row) => row.color === color);
    const variants = productVariants.filter((variant) => variant.color === color);
    const previousProducts = products;
    const previousInventory = inventory;
    const previousMedia = media;
    const nextOrder = colors.filter((item) => item !== color);
    onProductsChange(
      products.map((product) =>
        product.id === selectedProduct.id ? { ...product, color_order: nextOrder } : product,
      ),
    );
    onMediaChange(
      media.filter((row) => !(row.item_id === selectedProduct.id && row.color === color)),
    );
    onInventoryChange(
      inventory.filter(
        (variant) => !(variant.item_id === selectedProduct.id && variant.color === color),
      ),
    );
    setColorBusy(color);
    const { data, error } = await supabase.rpc("admin_delete_product_color", {
      p_item_id: selectedProduct.id,
      p_color: color,
    });
    setColorBusy(null);
    if (error) {
      onProductsChange(previousProducts);
      onInventoryChange(previousInventory);
      onMediaChange(previousMedia);
      onError(error.message);
      return;
    }
    const result = data as {
      deleted_media_count?: number;
      deleted_variant_count?: number;
      storage_urls?: string[];
    } | null;
    const storageUrls = Array.isArray(result?.storage_urls)
      ? result.storage_urls
      : rows.map((row) => row.url);
    const failures = await removeProductFiles(storageUrls);
    const deletedPhotoCount = result?.deleted_media_count ?? rows.length;
    const deletedVariantCount = result?.deleted_variant_count ?? variants.length;
    onNotice(
      failures.length
        ? `${color} removed from the product, but ${failures.length} storage file${failures.length === 1 ? "" : "s"} could not be removed.`
        : `${color} removed: ${deletedVariantCount} variant${deletedVariantCount === 1 ? "" : "s"} and ${deletedPhotoCount} photo${deletedPhotoCount === 1 ? "" : "s"} deleted`,
    );
  };

  return {
    newColor,
    setNewColor,
    colorBusy,
    addColor,
    renameColor,
    deleteColorGroup,
    moveColor,
    startColorDrag,
    dropColor,
  };
}
