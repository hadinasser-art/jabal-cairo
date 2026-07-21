import { supabase, type Item, inferGender, type Gender } from "./supabase";
import { fetchProductMediaConfig, getProductColorImage } from "./product-media";

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

export async function fetchFeaturedItems(limit = 8): Promise<Item[]> {
  const all = await fetchAllItems();
  const [featured, purchaseCounts] = await Promise.all([
    Promise.all(
      all.map(async (item) => {
        const config = await fetchProductMediaConfig(item);
        return sortItemColors(item).map((color) => ({
          ...item,
          color: [color],
          image_url: getProductColorImage(item, color, config),
          display_color: color,
          display_image_url: getProductColorImage(item, color, config),
          display_key: `${item.id}:${color}`,
        }));
      }),
    ),
    fetchPurchaseCounts(),
  ]);

  const items = featured.flat();
  if (!purchaseCounts.hasPurchases) return shuffleItems(items).slice(0, limit);

  const ranked = items.map((item) => ({
    item,
    purchaseCount: getPurchaseCount(item, purchaseCounts),
  }));
  const bought = ranked
    .filter(({ purchaseCount }) => purchaseCount > 0)
    .sort(
      (a, b) =>
        b.purchaseCount - a.purchaseCount ||
        new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime(),
    )
    .map(({ item }) => item);
  const fallback = shuffleItems(
    ranked.filter(({ purchaseCount }) => purchaseCount === 0).map(({ item }) => item),
  );

  return [...bought, ...fallback].slice(0, limit);
}

type PurchaseCounts = {
  hasPurchases: boolean;
  items: Map<string, number>;
  itemColors: Map<string, number>;
  itemsWithColorCounts: Set<string>;
};

type PurchaseCountRow = {
  item_id: string;
  selected_color: string | null;
  purchase_count: number | string;
};

async function fetchPurchaseCounts(): Promise<PurchaseCounts> {
  const empty = {
    hasPurchases: false,
    items: new Map<string, number>(),
    itemColors: new Map<string, number>(),
    itemsWithColorCounts: new Set<string>(),
  };

  try {
    const { data, error } = await withTimeout(supabase.rpc("get_item_purchase_counts"));
    if (error) {
      console.warn("get_item_purchase_counts", error.message);
      return empty;
    }

    const counts = {
      hasPurchases: false,
      items: new Map<string, number>(),
      itemColors: new Map<string, number>(),
      itemsWithColorCounts: new Set<string>(),
    };

    const rows = (data ?? []) as unknown as PurchaseCountRow[];
    for (const row of rows) {
      const count = Number(row.purchase_count || 0);
      if (!row.item_id || count <= 0) continue;
      counts.hasPurchases = true;
      counts.items.set(row.item_id, (counts.items.get(row.item_id) ?? 0) + count);
      if (row.selected_color) {
        const key = colorPurchaseKey(row.item_id, row.selected_color);
        counts.itemColors.set(key, (counts.itemColors.get(key) ?? 0) + count);
        counts.itemsWithColorCounts.add(row.item_id);
      }
    }

    return counts;
  } catch (error) {
    console.warn(
      "get_item_purchase_counts",
      error instanceof Error ? error.message : "Purchase counts failed",
    );
    return empty;
  }
}

function getPurchaseCount(item: Item, counts: PurchaseCounts) {
  if (item.display_color && counts.itemsWithColorCounts.has(item.id)) {
    return counts.itemColors.get(colorPurchaseKey(item.id, item.display_color)) ?? 0;
  }
  return counts.items.get(item.id) ?? 0;
}

function colorPurchaseKey(itemId: string, color: string) {
  return `${itemId}:${color.trim().toLowerCase()}`;
}

function sortItemColors(item: Item) {
  const colors = item.color || [];
  const colorOrder = item.color_order || [];
  if (colorOrder.length === 0) return colors;
  return [...colors].sort((a, b) => {
    const aIndex = colorOrder.indexOf(a);
    const bIndex = colorOrder.indexOf(b);
    const aSort = aIndex === -1 ? colorOrder.length : aIndex;
    const bSort = bIndex === -1 ? colorOrder.length : bIndex;
    return aSort - bSort || a.localeCompare(b);
  });
}

function shuffleItems(items: Item[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
