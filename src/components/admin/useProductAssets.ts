import { useState, type Dispatch, type SetStateAction } from "react";
import { removeProductFiles, uploadProductImage } from "@/components/admin/photo-storage";
import type { AdminProductRow, ProductAssetField } from "@/components/admin/types";
import { supabase } from "@/lib/supabase";

interface UseProductAssetsOptions {
  products: AdminProductRow[];
  selectedProduct: AdminProductRow | null;
  onProductsChange: Dispatch<SetStateAction<AdminProductRow[]>>;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

/** The two single-image fields on a product: its main image and its size chart. */
export function useProductAssets({
  products,
  selectedProduct,
  onProductsChange,
  onNotice,
  onError,
}: UseProductAssetsOptions) {
  const [assetBusy, setAssetBusy] = useState<ProductAssetField | null>(null);

  const saveAsset = async (nextProduct: AdminProductRow) => {
    const { error } = await supabase.rpc("admin_update_item_media", {
      p_item_id: nextProduct.id,
      p_image_url: nextProduct.image_url,
      p_size_chart_url: nextProduct.size_chart_url,
      p_color_order: nextProduct.color_order,
    });
    if (error) throw error;
  };

  const updateAsset = async (field: ProductAssetField, file: File) => {
    if (!selectedProduct) return;
    const previousProducts = products;
    const previousUrl = selectedProduct[field];
    let uploadedUrl = "";
    setAssetBusy(field);
    try {
      const uploaded = await uploadProductImage(selectedProduct.id, file);
      uploadedUrl = uploaded.url;
      const nextProduct = { ...selectedProduct, [field]: uploaded.url };
      onProductsChange(
        products.map((product) => (product.id === selectedProduct.id ? nextProduct : product)),
      );
      await saveAsset(nextProduct);
      const failures = previousUrl ? await removeProductFiles([previousUrl]) : [];
      onNotice(
        failures.length
          ? "Image updated, but the previous storage file could not be removed."
          : "Image updated",
      );
    } catch (error) {
      onProductsChange(previousProducts);
      if (uploadedUrl) await removeProductFiles([uploadedUrl]);
      onError(error instanceof Error ? error.message : "Image update failed");
    } finally {
      setAssetBusy(null);
    }
  };

  const removeAsset = async (field: ProductAssetField) => {
    if (!selectedProduct) return;
    const previousProducts = products;
    const previousUrl = selectedProduct[field];
    const nextProduct = { ...selectedProduct, [field]: null };
    onProductsChange(
      products.map((product) => (product.id === selectedProduct.id ? nextProduct : product)),
    );
    setAssetBusy(field);
    try {
      await saveAsset(nextProduct);
      const failures = previousUrl ? await removeProductFiles([previousUrl]) : [];
      onNotice(
        failures.length
          ? "Image removed from the product, but its storage file could not be removed."
          : "Image removed",
      );
    } catch (error) {
      onProductsChange(previousProducts);
      onError(error instanceof Error ? error.message : "Image removal failed");
    } finally {
      setAssetBusy(null);
    }
  };

  return { assetBusy, updateAsset, removeAsset };
}
