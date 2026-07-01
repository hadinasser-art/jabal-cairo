import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export function createSupabaseAdmin() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
