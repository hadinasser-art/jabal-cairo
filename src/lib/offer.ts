import { supabase } from "./supabase";

export type Offer = {
  id: string;
  title: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | string;
  discount_value: number;
  first_order_only: boolean | null;
  code: string | null;
  offer_type: string | null;
  active: boolean | null;
  priority: number | null;
  minimum_order_egp: number | null;
};

export async function fetchActivePopupOffer(): Promise<Offer | null> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("active", true)
    .eq("offer_type", "standard")
    .is("code", null)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("fetchActivePopupOffer", error.message);
    return null;
  }
  return (data as Offer) ?? null;
}

export function computeDiscount(offer: Offer | null, subtotal: number): number {
  if (!offer) return 0;
  if (offer.minimum_order_egp && subtotal < offer.minimum_order_egp) return 0;
  if (offer.discount_type === "percentage") {
    return Math.round((subtotal * offer.discount_value) / 100);
  }
  return Math.round(offer.discount_value);
}
