import { supabase } from "./supabase";

type MarketingConsentSource = "website" | "register" | "checkout" | "post_login_popup";

export async function recordMarketingConsent({
  email,
  userId,
  source,
}: {
  email: string;
  userId?: string | null;
  source: MarketingConsentSource;
}): Promise<boolean> {
  const { error } = await supabase.rpc("record_marketing_consent", {
    p_email: email.trim(),
    p_user_id: userId ?? null,
    p_source: source,
  });

  if (error) {
    console.warn("recordMarketingConsent", error.message);
    return false;
  }

  return true;
}

export async function hasMarketingConsent(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_marketing_consent", {
    p_email: email.trim(),
  });

  if (error) {
    console.warn("hasMarketingConsent", error.message);
    return false;
  }

  return data === true;
}
