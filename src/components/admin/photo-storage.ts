import { supabase } from "@/lib/supabase";

export async function uploadProductImage(itemId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = (extMatch?.[1] || "jpg").toLowerCase();
  const path = `admin-uploads/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return {
    path,
    url: supabase.storage.from("products").getPublicUrl(path).data.publicUrl,
  };
}

export function productStoragePath(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const markers = ["/storage/v1/object/public/products/", "/storage/v1/object/sign/products/"];
    const marker = markers.find((candidate) => pathname.includes(candidate));
    if (!marker) return null;
    const path = pathname.slice(pathname.indexOf(marker) + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

export async function removeProductFiles(urls: string[]) {
  const paths = Array.from(
    new Set(urls.map(productStoragePath).filter((path): path is string => !!path)),
  );
  if (paths.length === 0) return [];
  const failures: string[] = [];
  for (let index = 0; index < paths.length; index += 1000) {
    const batch = paths.slice(index, index + 1000);
    const { error } = await supabase.storage.from("products").remove(batch);
    if (error) failures.push(...batch);
  }
  return failures;
}

export function labelFromFile(file: File) {
  const withoutExtension = file.name.replace(/\.[^.]+$/, "");
  const label = withoutExtension.replace(/[-_]+/g, " ").trim();
  return label || "Product photo";
}
