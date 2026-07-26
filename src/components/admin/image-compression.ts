/**
 * Shrinks product photography in the browser before it reaches Storage.
 *
 * Phone and camera originals routinely land at 4000px / several MB, and every one of
 * those bytes is billed again on each CDN miss. Re-encoding to WebP at a sane edge
 * length typically cuts a product photo by 80-90% with no visible difference at the
 * sizes the storefront actually renders.
 */

/** Long edge, in pixels. Comfortably above the largest rendered size, so zoom stays sharp. */
const MAX_EDGE = 2000;

/** High enough that fabric texture and brand colors survive re-encoding. */
const QUALITY = 0.85;

/** Formats that are safe to re-encode. GIF would lose animation, SVG is vector. */
const RECOMPRESSABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressProductImage(file: File): Promise<File> {
  if (!RECOMPRESSABLE.has(file.type) || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, which canvas would otherwise drop.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );

    // Browsers without WebP encoding silently fall back to PNG, which can be larger
    // than the original. Only take the result when it is genuinely both WebP and smaller.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    return new File([blob], replaceExtension(file.name, "webp"), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

function replaceExtension(fileName: string, extension: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.${extension}`;
}
