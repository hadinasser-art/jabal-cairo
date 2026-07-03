import { supabase } from "./supabase";

type MarketingConsentSource = "register" | "checkout";

export async function recordMarketingConsent({
  email,
  userId,
  source,
}: {
  email: string;
  userId?: string | null;
  source: MarketingConsentSource;
}): Promise<void> {
  const { error } = await supabase.rpc("record_marketing_consent", {
    p_email: email.trim(),
    p_user_id: userId ?? null,
    p_source: source,
  });

  if (error) console.warn("recordMarketingConsent", error.message);
}
