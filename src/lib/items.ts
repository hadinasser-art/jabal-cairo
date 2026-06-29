import { supabase, type Item, inferGender, type Gender } from "./supabase";

let cache: Item[] | null = null;

export async function fetchAllItems(): Promise<Item[]> {
  if (cache) return cache;
  // Try with gender; fall back to * if column missing
  let { data, error } = await supabase
    .from("items")
    .select("id,name,description,price_egp,image_url,category,size,color,stock_quantity,sold_out,created_at,gender")
    .order("created_at", { ascending: false });
  if (error && /gender/i.test(error.message)) {
    const r = await supabase.from("items").select("*").order("created_at", { ascending: false });
    data = r.data;
    error = r.error;
  }
  if (error) {
    console.warn("fetchAllItems", error.message);
    return [];
  }
  cache = (data as Item[]) || [];
  return cache;
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
  if (all.length === 0) return [];

  const byId = new Map(all.map((item) => [item.id, item]));
  const { data, error } = await supabase
    .from("orders")
    .select("item_id,quantity")
    .not("item_id", "is", null)
    .limit(1000);

  if (error) {
    console.warn("fetchFeaturedItems", error.message);
    return all.slice(0, limit);
  }

  const soldByItem = new Map<string, number>();
  for (const row of data || []) {
    const itemId = row.item_id as string | null;
    if (!itemId || !byId.has(itemId)) continue;
    soldByItem.set(itemId, (soldByItem.get(itemId) || 0) + (Number(row.quantity) || 0));
  }

  const ranked = [...soldByItem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([itemId]) => byId.get(itemId))
    .filter((item): item is Item => Boolean(item));

  const rankedIds = new Set(ranked.map((item) => item.id));
  const fallback = all.filter((item) => !rankedIds.has(item.id));

  return [...ranked, ...fallback].slice(0, limit);
}
