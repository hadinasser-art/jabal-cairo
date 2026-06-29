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
