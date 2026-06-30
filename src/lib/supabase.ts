import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ymzbqlobqlumkmvukyza.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltemJxbG9icWx1bWttdnVreXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODA3NTIsImV4cCI6MjA5ODE1Njc1Mn0.mZGt9XFdWNQlCmPHktcPWjJB2nRD9YnhRG-z2Q7nRPY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "jabal-auth",
  },
});

export const JABAL_LOGO_URL =
  "https://ymzbqlobqlumkmvukyza.supabase.co/storage/v1/object/public/logo/JABAL.png";

export const JABAL_SUPPORT_EMAIL = "jabal.egy@gmail.com";
export const JABAL_SUPPORT_PHONE = "01061024345";

export type Gender = "mens" | "womens" | "unisex";

export type Item = {
  id: string;
  name: string;
  description: string | null;
  price_egp: number;
  image_url: string | null;
  category: string | null;
  size: string[] | null;
  color: string[] | null;
  stock_quantity: number;
  sold_out: boolean;
  created_at: string;
  gender?: Gender | null;
};

export type ProductVariant = {
  id: string;
  item_id: string;
  color: string;
  size: string;
  stock_quantity: number;
  image_url: string | null;
  sku: string | null;
  created_at: string;
  updated_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  item_id: string;
  variant_id: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  total_price_egp: number;
  status: string;
  created_at: string;
  user_id?: string | null;
};

export const formatPrice = (p: number) =>
  "EGP " + Math.round(p).toLocaleString("en-EG");

export const SIZE_ORDER = ["S", "M", "L", "XL", "XXL"] as const;

export function sizeSortValue(size: string) {
  const normalized = size.trim().toUpperCase();
  const index = SIZE_ORDER.findIndex((s) => s === normalized);
  return index === -1 ? SIZE_ORDER.length : index;
}

export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => sizeSortValue(a) - sizeSortValue(b) || a.localeCompare(b));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string | null | undefined): s is string =>
  !!s && UUID_RE.test(s);

// Heuristic until gender column populated
export function inferGender(item: Pick<Item, "name" | "category" | "gender">): Gender {
  if (item.gender === "mens" || item.gender === "womens" || item.gender === "unisex") return item.gender;
  const n = (item.name || "").toLowerCase();
  if (/(women|womens|ladies|dress|skirt|cardigan|fitted top|high waist)/.test(n)) return "womens";
  if (/(men|mens|training shorts|shorts)/.test(n)) return "mens";
  return "unisex";
}

export const EGYPT_GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia", "Beheira",
  "Kafr El Sheikh", "Gharbia", "Monufia", "Damietta", "Port Said", "Ismailia",
  "Suez", "North Sinai", "South Sinai", "Faiyum", "Beni Suef", "Minya", "Asyut",
  "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "New Valley", "Matrouh",
];
