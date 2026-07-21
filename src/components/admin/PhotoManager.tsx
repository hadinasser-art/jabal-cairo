import { useMemo, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { ImagePlus, Loader2, Plus } from "lucide-react";
import { ColorGroup } from "@/components/admin/ColorGroup";
import { MediaAssetCard } from "@/components/admin/MediaAssetCard";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { SectionCard } from "@/components/admin/AdminUi";
import {
  labelFromFile,
  removeProductFiles,
  uploadProductImage,
} from "@/components/admin/photo-storage";
import type { SaveState } from "@/components/admin/PhotoTile";
import type {
  AdminMediaRow,
  AdminProductRow,
  MediaKind,
  UploadJob,
} from "@/components/admin/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface PhotoManagerProps {
  products: AdminProductRow[];
  media: AdminMediaRow[];
  onProductsChange: Dispatch<SetStateAction<AdminProductRow[]>>;
  onMediaChange: Dispatch<SetStateAction<AdminMediaRow[]>>;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

type PhotoDraft = { label: string; kind: MediaKind };
type AssetField = "image_url" | "size_chart_url";

export function PhotoManager({
  products,
  media,
  onProductsChange,
  onMediaChange,
  onNotice,
  onError,
}: PhotoManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, PhotoDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [newColor, setNewColor] = useState("");
  const [assetBusy, setAssetBusy] = useState<AssetField | null>(null);
  const [colorBusy, setColorBusy] = useState<string | null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [draggedColor, setDraggedColor] = useState<string | null>(null);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || products[0] || null;
  const productMedia = useMemo(
    () =>
      media
        .filter((row) => row.item_id === selectedProduct?.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [media, selectedProduct?.id],
  );
  const colors = useMemo(() => {
    const configured = selectedProduct?.color_order || [];
    const extras = productMedia
      .map((row) => row.color)
      .filter((color): color is string => !!color && !configured.includes(color));
    return Array.from(new Set([...configured, ...extras]));
  }, [productMedia, selectedProduct?.color_order]);

  const setPhotoState = (id: string, state: SaveState) => {
    setSaveStates((current) => ({ ...current, [id]: state }));
  };

  const updatePhoto = async (row: AdminMediaRow, patch: Partial<AdminMediaRow>) => {
    const currentDraft = drafts[row.id] || { label: row.label, kind: row.kind };
    const nextRow: AdminMediaRow = {
      ...row,
      label: currentDraft.label,
      kind: currentDraft.kind,
      ...patch,
    };
    if (!nextRow.label.trim()) {
      setPhotoState(row.id, { status: "error", message: "Label is required" });
      return false;
    }

    const previousMedia = media;
    onMediaChange(media.map((item) => (item.id === row.id ? nextRow : item)));
    setPhotoState(row.id, { status: "saving" });
    const { error } = await supabase.rpc("admin_upsert_product_media", {
      p_id: row.id,
      p_item_id: row.item_id,
      p_color: nextRow.color,
      p_label: nextRow.label.trim(),
      p_url: nextRow.url,
      p_kind: nextRow.kind,
      p_sort_order: nextRow.sort_order,
    });
    if (error) {
      onMediaChange(previousMedia);
      setPhotoState(row.id, { status: "error", message: error.message });
      onError(error.message);
      return false;
    }
    setDrafts((current) => ({
      ...current,
      [row.id]: { label: nextRow.label.trim(), kind: nextRow.kind },
    }));
    setPhotoState(row.id, { status: "saved" });
    return true;
  };

  const replacePhoto = async (row: AdminMediaRow, file: File) => {
    setPhotoState(row.id, { status: "saving" });
    let uploadedUrl = "";
    try {
      const uploaded = await uploadProductImage(row.item_id, file);
      uploadedUrl = uploaded.url;
      const saved = await updatePhoto(row, { url: uploaded.url });
      if (!saved) {
        await removeProductFiles([uploaded.url]);
        return;
      }
      const failures = await removeProductFiles([row.url]);
      onNotice(
        failures.length
          ? "Photo replaced, but the previous storage file could not be removed."
          : "Photo replaced",
      );
    } catch (error) {
      if (uploadedUrl) await removeProductFiles([uploadedUrl]);
      const message = error instanceof Error ? error.message : "Image replacement failed";
      setPhotoState(row.id, { status: "error", message });
      onError(message);
    }
  };

  const deletePhoto = async (row: AdminMediaRow) => {
    const previousMedia = media;
    onMediaChange(media.filter((item) => item.id !== row.id));
    setPhotoState(row.id, { status: "saving" });
    const { error } = await supabase.rpc("admin_delete_product_media", { p_id: row.id });
    if (error) {
      onMediaChange(previousMedia);
      setPhotoState(row.id, { status: "error", message: error.message });
      onError(error.message);
      return;
    }
    const failures = await removeProductFiles([row.url]);
    onNotice(
      failures.length
        ? "Photo row deleted, but its storage file could not be removed."
        : "Photo and storage file deleted",
    );
  };

  const persistPhotoOrder = async (color: string | null, orderedRows: AdminMediaRow[]) => {
    if (!selectedProduct) return;
    const previousMedia = media;
    const orderById = new Map(orderedRows.map((row, index) => [row.id, (index + 1) * 10]));
    onMediaChange(
      media.map((row) =>
        orderById.has(row.id) ? { ...row, sort_order: orderById.get(row.id) || 0 } : row,
      ),
    );
    orderedRows.forEach((row) => setPhotoState(row.id, { status: "saving" }));
    const { error } = await supabase.rpc("admin_reorder_product_media", {
      p_item_id: selectedProduct.id,
      p_color: color,
      p_ids: orderedRows.map((row) => row.id),
    });
    if (error) {
      onMediaChange(previousMedia);
      orderedRows.forEach((row) =>
        setPhotoState(row.id, { status: "error", message: error.message }),
      );
      onError(error.message);
      return;
    }
    orderedRows.forEach((row) => setPhotoState(row.id, { status: "saved" }));
    onNotice("Photo order saved");
  };

  const movePhoto = (color: string | null, rowId: string, direction: -1 | 1) => {
    const rows = productMedia.filter((row) => row.color === color);
    const from = rows.findIndex((row) => row.id === rowId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= rows.length) return;
    void persistPhotoOrder(color, moveInArray(rows, from, to));
  };

  const dropPhoto = (event: DragEvent<HTMLDivElement>, color: string | null, targetId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedPhotoId || draggedPhotoId === targetId) return;
    const rows = productMedia.filter((row) => row.color === color);
    const from = rows.findIndex((row) => row.id === draggedPhotoId);
    const to = rows.findIndex((row) => row.id === targetId);
    setDraggedPhotoId(null);
    if (from < 0 || to < 0) return;
    void persistPhotoOrder(color, moveInArray(rows, from, to));
  };

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
    if (await persistColorOrder([...colors, color], `${color} added`)) setNewColor("");
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
    const previousProducts = products;
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
    setColorBusy(color);
    const { error } = await supabase.rpc("admin_delete_product_media_group", {
      p_item_id: selectedProduct.id,
      p_color: color,
    });
    setColorBusy(null);
    if (error) {
      onProductsChange(previousProducts);
      onMediaChange(previousMedia);
      onError(error.message);
      return;
    }
    const failures = await removeProductFiles(rows.map((row) => row.url));
    onNotice(
      failures.length
        ? `${color} deleted, but ${failures.length} storage file${failures.length === 1 ? "" : "s"} could not be removed.`
        : `${color} and ${rows.length} photo${rows.length === 1 ? "" : "s"} deleted`,
    );
  };

  const uploadFiles = async (color: string | null, files: File[]) => {
    if (!selectedProduct || files.length === 0) return;
    const groupRows = productMedia.filter((row) => row.color === color);
    const startingOrder = groupRows.length
      ? Math.max(...groupRows.map((row) => row.sort_order)) + 10
      : 10;
    const jobs: UploadJob[] = files.map((file) => ({
      id: crypto.randomUUID(),
      color,
      fileName: file.name,
      progress: 5,
      status: "uploading",
    }));
    setUploadJobs((current) => [
      ...current.filter((job) => !(job.color === color && job.status === "success")),
      ...jobs,
    ]);

    await Promise.all(
      files.map(async (file, index) => {
        const job = jobs[index];
        let uploadedUrl = "";
        try {
          updateUploadJob(job.id, { progress: 20 });
          const uploaded = await uploadProductImage(selectedProduct.id, file);
          uploadedUrl = uploaded.url;
          updateUploadJob(job.id, { progress: 70 });
          const { data, error } = await supabase.rpc("admin_upsert_product_media", {
            p_id: null,
            p_item_id: selectedProduct.id,
            p_color: color,
            p_label: labelFromFile(file),
            p_url: uploaded.url,
            p_kind: "gallery",
            p_sort_order: startingOrder + index * 10,
          });
          if (error) throw error;
          const inserted = (Array.isArray(data) ? data[0] : data) as unknown as AdminMediaRow;
          if (!inserted?.id) throw new Error("The uploaded photo row was not returned");
          onMediaChange((current) => [
            ...current.filter((row) => row.id !== inserted.id),
            { ...inserted, kind: inserted.kind as MediaKind },
          ]);
          updateUploadJob(job.id, { progress: 100, status: "success", message: "Uploaded" });
        } catch (error) {
          if (uploadedUrl) await removeProductFiles([uploadedUrl]);
          const message = error instanceof Error ? error.message : "Upload failed";
          updateUploadJob(job.id, { progress: 100, status: "error", message });
          onError(`${file.name}: ${message}`);
        }
      }),
    );
  };

  const updateUploadJob = (id: string, patch: Partial<UploadJob>) => {
    setUploadJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const updateAsset = async (field: AssetField, file: File) => {
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
      const { error } = await supabase.rpc("admin_update_item_media", {
        p_item_id: selectedProduct.id,
        p_image_url: nextProduct.image_url,
        p_size_chart_url: nextProduct.size_chart_url,
        p_color_order: nextProduct.color_order,
      });
      if (error) throw error;
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

  const removeAsset = async (field: AssetField) => {
    if (!selectedProduct) return;
    const previousProducts = products;
    const previousUrl = selectedProduct[field];
    const nextProduct = { ...selectedProduct, [field]: null };
    onProductsChange(
      products.map((product) => (product.id === selectedProduct.id ? nextProduct : product)),
    );
    setAssetBusy(field);
    const { error } = await supabase.rpc("admin_update_item_media", {
      p_item_id: selectedProduct.id,
      p_image_url: nextProduct.image_url,
      p_size_chart_url: nextProduct.size_chart_url,
      p_color_order: nextProduct.color_order,
    });
    if (error) {
      onProductsChange(previousProducts);
      onError(error.message);
      setAssetBusy(null);
      return;
    }
    const failures = previousUrl ? await removeProductFiles([previousUrl]) : [];
    setAssetBusy(null);
    onNotice(
      failures.length
        ? "Image removed from the product, but its storage file could not be removed."
        : "Image removed",
    );
  };

  return (
    <SectionCard eyebrow="Photos" title="Product photography">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Product</Label>
          <ProductPicker
            products={products}
            selectedProductId={selectedProduct?.id || ""}
            onSelect={setSelectedProductId}
          />
        </div>

        {!selectedProduct ? (
          <Alert>
            <ImagePlus aria-hidden="true" />
            <AlertTitle>No products yet</AlertTitle>
            <AlertDescription>Add a product before managing photography.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <Badge variant="outline" className="capitalize">
                {selectedProduct.gender || "unisex"}
              </Badge>
              <h3 className="mt-2 text-xl font-light">{selectedProduct.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Changes autosave. Drag to reorder, or use the move buttons for keyboard and touch.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <MediaAssetCard
                title="Main image"
                description="Primary product image used across cards and product pages."
                imageUrl={selectedProduct.image_url}
                imageAlt={`${selectedProduct.name} main`}
                busy={assetBusy === "image_url"}
                onUpload={(file) => void updateAsset("image_url", file)}
                onRemove={() => void removeAsset("image_url")}
              />
              <MediaAssetCard
                title="Size chart"
                description="Reference image shown to shoppers while selecting a size."
                imageUrl={selectedProduct.size_chart_url}
                imageAlt={`${selectedProduct.name} size chart`}
                busy={assetBusy === "size_chart_url"}
                onUpload={(file) => void updateAsset("size_chart_url", file)}
                onRemove={() => void removeAsset("size_chart_url")}
              />
            </div>

            <div className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-color">Add a color group</Label>
                <Input
                  id="new-color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void addColor();
                  }}
                  placeholder="e.g. Forest Green"
                />
              </div>
              <Button type="button" onClick={() => void addColor()} disabled={colorBusy !== null}>
                {colorBusy === "order" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                Add color
              </Button>
            </div>

            <div className="grid gap-4">
              {colors.map((color, index) => (
                <ColorGroup
                  key={color}
                  color={color}
                  rows={productMedia.filter((row) => row.color === color)}
                  colorPosition={index}
                  colorCount={colors.length}
                  uploadJobs={uploadJobs.filter((job) => job.color === color)}
                  drafts={drafts}
                  saveStates={saveStates}
                  busy={colorBusy !== null}
                  onFiles={(files) => void uploadFiles(color, files)}
                  onRename={(nextColor) => renameColor(color, nextColor)}
                  onDeleteGroup={() => void deleteColorGroup(color)}
                  onMoveGroup={(direction) => moveColor(color, direction)}
                  onGroupDragStart={(event) => {
                    event.stopPropagation();
                    setDraggedColor(color);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onGroupDrop={(event) => dropColor(event, color)}
                  onLabelChange={(row, label) =>
                    setDrafts((current) => ({
                      ...current,
                      [row.id]: { label, kind: current[row.id]?.kind || row.kind },
                    }))
                  }
                  onLabelCommit={(row) => {
                    const label = drafts[row.id]?.label ?? row.label;
                    if (label.trim() !== row.label) void updatePhoto(row, { label });
                  }}
                  onKindChange={(row, kind) => {
                    setDrafts((current) => ({
                      ...current,
                      [row.id]: { label: current[row.id]?.label || row.label, kind },
                    }));
                    void updatePhoto(row, { kind });
                  }}
                  onReplace={(row, file) => void replacePhoto(row, file)}
                  onDeletePhoto={(row) => void deletePhoto(row)}
                  onMovePhoto={(rowId, direction) => movePhoto(color, rowId, direction)}
                  onPhotoDragStart={(event, rowId) => {
                    event.stopPropagation();
                    setDraggedPhotoId(rowId);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onPhotoDrop={(event, rowId) => dropPhoto(event, color, rowId)}
                />
              ))}

              <ColorGroup
                color={null}
                rows={productMedia.filter((row) => !row.color)}
                colorPosition={colors.length}
                colorCount={colors.length}
                uploadJobs={uploadJobs.filter((job) => job.color === null)}
                drafts={drafts}
                saveStates={saveStates}
                busy={false}
                onFiles={(files) => void uploadFiles(null, files)}
                onRename={async () => false}
                onDeleteGroup={() => undefined}
                onMoveGroup={() => undefined}
                onGroupDragStart={() => undefined}
                onGroupDrop={(event) => event.preventDefault()}
                onLabelChange={(row, label) =>
                  setDrafts((current) => ({
                    ...current,
                    [row.id]: { label, kind: current[row.id]?.kind || row.kind },
                  }))
                }
                onLabelCommit={(row) => {
                  const label = drafts[row.id]?.label ?? row.label;
                  if (label.trim() !== row.label) void updatePhoto(row, { label });
                }}
                onKindChange={(row, kind) => {
                  setDrafts((current) => ({
                    ...current,
                    [row.id]: { label: current[row.id]?.label || row.label, kind },
                  }));
                  void updatePhoto(row, { kind });
                }}
                onReplace={(row, file) => void replacePhoto(row, file)}
                onDeletePhoto={(row) => void deletePhoto(row)}
                onMovePhoto={(rowId, direction) => movePhoto(null, rowId, direction)}
                onPhotoDragStart={(event, rowId) => {
                  event.stopPropagation();
                  setDraggedPhotoId(rowId);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onPhotoDrop={(event, rowId) => dropPhoto(event, null, rowId)}
              />
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function moveInArray<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
