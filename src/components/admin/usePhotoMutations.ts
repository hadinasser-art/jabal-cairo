import { useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { moveInArray } from "@/components/admin/admin-utils";
import {
  labelFromFile,
  removeProductFiles,
  uploadProductImage,
} from "@/components/admin/photo-storage";
import type { SaveState } from "@/components/admin/PhotoTile";
import type { AdminMediaRow, MediaKind, PhotoDraft, UploadJob } from "@/components/admin/types";
import { supabase } from "@/lib/supabase";

interface UsePhotoMutationsOptions {
  media: AdminMediaRow[];
  /** Media for the selected product only, already sorted by sort_order. */
  productMedia: AdminMediaRow[];
  selectedProductId: string | null;
  onMediaChange: Dispatch<SetStateAction<AdminMediaRow[]>>;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
}

/** Every write that touches a single product photo: label, kind, file, order and deletion. */
export function usePhotoMutations({
  media,
  productMedia,
  selectedProductId,
  onMediaChange,
  onNotice,
  onError,
}: UsePhotoMutationsOptions) {
  const [drafts, setDrafts] = useState<Record<string, PhotoDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

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
    const { data: deleted, error } = await supabase.rpc("admin_delete_product_media", {
      p_id: row.id,
    });
    if (error || deleted !== true) {
      onMediaChange(previousMedia);
      const message = error?.message || "The photo could not be deleted. Refresh and try again.";
      setPhotoState(row.id, { status: "error", message });
      onError(message);
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
    if (!selectedProductId) return;
    const previousMedia = media;
    const orderById = new Map(orderedRows.map((row, index) => [row.id, (index + 1) * 10]));
    onMediaChange(
      media.map((row) =>
        orderById.has(row.id) ? { ...row, sort_order: orderById.get(row.id) || 0 } : row,
      ),
    );
    orderedRows.forEach((row) => setPhotoState(row.id, { status: "saving" }));
    const { error } = await supabase.rpc("admin_reorder_product_media", {
      p_item_id: selectedProductId,
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

  const startPhotoDrag = (event: DragEvent<HTMLButtonElement>, rowId: string) => {
    event.stopPropagation();
    setDraggedPhotoId(rowId);
    event.dataTransfer.effectAllowed = "move";
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

  const updateUploadJob = (id: string, patch: Partial<UploadJob>) => {
    setUploadJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  };

  const uploadFiles = async (color: string | null, files: File[]) => {
    if (!selectedProductId || files.length === 0) return;
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
          const uploaded = await uploadProductImage(selectedProductId, file);
          uploadedUrl = uploaded.url;
          updateUploadJob(job.id, { progress: 70 });
          const { data, error } = await supabase.rpc("admin_upsert_product_media", {
            p_id: null,
            p_item_id: selectedProductId,
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

  const changeLabel = (row: AdminMediaRow, label: string) => {
    setDrafts((current) => ({
      ...current,
      [row.id]: { label, kind: current[row.id]?.kind || row.kind },
    }));
  };

  const commitLabel = (row: AdminMediaRow) => {
    const label = drafts[row.id]?.label ?? row.label;
    if (label.trim() !== row.label) void updatePhoto(row, { label });
  };

  const changeKind = (row: AdminMediaRow, kind: MediaKind) => {
    setDrafts((current) => ({
      ...current,
      [row.id]: { label: current[row.id]?.label || row.label, kind },
    }));
    void updatePhoto(row, { kind });
  };

  return {
    drafts,
    saveStates,
    uploadJobs,
    changeLabel,
    commitLabel,
    changeKind,
    replacePhoto,
    deletePhoto,
    movePhoto,
    startPhotoDrag,
    dropPhoto,
    uploadFiles,
  };
}
