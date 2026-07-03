import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { upsertProfile } from "@/lib/profile";
import { recordMarketingConsent } from "@/lib/marketing";

const PENDING_MARKETING_CONSENT_KEY = "pendingMarketingConsent";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (u) {
        const meta = (u.user_metadata || {}) as Record<string, string>;
        const full = meta.full_name || meta.name || "";
        const [first = "", ...rest] = full.split(" ");
        await upsertProfile({
          user_id: u.id,
          first_name: meta.given_name || first || null,
          last_name: meta.family_name || rest.join(" ") || null,
          email: u.email || null,
          phone: null,
          full_address: null,
          city: null,
          governorate: null,
        });
        if (localStorage.getItem(PENDING_MARKETING_CONSENT_KEY) === "1" && u.email) {
          await recordMarketingConsent({
            email: u.email,
            userId: u.id,
            source: "website",
          });
          localStorage.removeItem(PENDING_MARKETING_CONSENT_KEY);
        }
        navigate({ to: "/account" });
      } else {
        localStorage.removeItem(PENDING_MARKETING_CONSENT_KEY);
        navigate({ to: "/login" });
      }
    })();
  }, [navigate]);

  return (
    <Layout>
      <div
        className="px-6 py-24 text-center"
        style={{
          color: "#9a9a9a",
          fontSize: 12,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Signing you in…
      </div>
    </Layout>
  );
}
