import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ymzbqlobqlumkmvukyza.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltemJxbG9icWx1bWttdnVreXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODA3NTIsImV4cCI6MjA5ODE1Njc1Mn0.mZGt9XFdWNQlCmPHktcPWjJB2nRD9YnhRG-z2Q7nRPY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
};

export type Order = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_price_egp: number;
  status: string;
  created_at: string;
};

export const formatPrice = (p: number) =>
  "EGP " + Math.round(p).toLocaleString("en-EG");
