import { supabase } from "./supabase";

export type CustomerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  full_address: string | null;
  city: string | null;
  governorate: string | null;
  first_order_discount_used?: boolean | null;
};

export async function loadProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("loadProfile", error.message);
    return null;
  }
  return (data as CustomerProfile) ?? null;
}

export async function upsertProfile(profile: CustomerProfile): Promise<void> {
  const { error } = await supabase
    .from("customer_profiles")
    .upsert(profile, { onConflict: "user_id" });
  if (error) console.warn("upsertProfile", error.message);
}

export async function markFirstOrderUsed(userId: string): Promise<void> {
  const { error } = await supabase
    .from("customer_profiles")
    .update({ first_order_discount_used: true })
    .eq("user_id", userId);
  if (error) console.warn("markFirstOrderUsed", error.message);
}
