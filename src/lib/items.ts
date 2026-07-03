import { supabase, type Item, inferGender, type Gender } from "./supabase";

let cache: Item[] | null = null;
let inFlight: Promise<Item[]> | null = null;
const ITEMS_TIMEOUT_MS = 8000;

export async function fetchAllItems(): Promise<Item[]> {
  if (cache) return cache;
  if (inFlight) return inFlight;

  inFlight = loadItems().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function loadItems(): Promise<Item[]> {
  // Try with gender; fall back to * if column missing
  try {
    let { data, error } = await withTimeout(
      supabase
        .from("items")
        .select(
          "id,name,description,price_egp,image_url,category,size,color,stock_quantity,sold_out,created_at,gender,color_order",
        )
        .order("created_at", { ascending: false }),
    );
    if (error && /(gender|color_order)/i.test(error.message)) {
      const r = await withTimeout(
        supabase.from("items").select("*").order("created_at", { ascending: false }),
      );
      data = r.data;
      error = r.error;
    }
    if (error) {
      console.warn("fetchAllItems", error.message);
      return [];
    }
    cache = (data as Item[]) || [];
    return cache;
  } catch (error) {
    console.warn("fetchAllItems", error instanceof Error ? error.message : "Product load failed");
    return [];
  }
}

function withTimeout<T>(query: PromiseLike<T>): Promise<T> {
  return Promise.race([
    query,
    new Promise<T>((_, reject) =>
      globalThis.setTimeout(() => reject(new Error("Product loading timed out")), ITEMS_TIMEOUT_MS),
    ),
  ]);
}

export async function fetchItemsByGender(target: Gender): Promise<Item[]> {
  const all = await fetchAllItems();
  return all.filter((it) => {
    const g = inferGender(it);
    return g === target || g === "unisex";
  });
}

export async function fetchFeaturedItems(limit = 4): Promise<Item[]> {
  const all = await fetchAllItems();
  return all.slice(0, limit);
}
