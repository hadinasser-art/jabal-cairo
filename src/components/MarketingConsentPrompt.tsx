import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { hasMarketingConsent, recordMarketingConsent } from "@/lib/marketing";

const DISMISSED_KEY_PREFIX = "jabal_marketing_prompt_dismissed:";

export function MarketingConsentPrompt() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function decide() {
      setVisible(false);
      if (loading || !user?.email) return;

      const email = user.email.trim().toLowerCase();
      const dismissedKey = `${DISMISSED_KEY_PREFIX}${email}`;
      if (localStorage.getItem(dismissedKey) === "1") return;

      const alreadySubscribed = await hasMarketingConsent(email);
      if (!cancelled && !alreadySubscribed) setVisible(true);
    }

    decide();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.email]);

  if (!visible || !user?.email) return null;

  const dismissedKey = `${DISMISSED_KEY_PREFIX}${user.email.trim().toLowerCase()}`;

  const dismiss = () => {
    localStorage.setItem(dismissedKey, "1");
    setVisible(false);
  };

  const accept = async () => {
    setBusy(true);
    const saved = await recordMarketingConsent({
      email: user.email || "",
      userId: user.id,
      source: "post_login_popup",
    });
    setBusy(false);
    if (!saved) {
      toast.error("Could not save your email preference. Please try again.");
      return;
    }

    localStorage.setItem(dismissedKey, "1");
    setVisible(false);
    toast("You're subscribed to JABAL updates.");
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[160] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.72)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketing-consent-title"
        className="w-full max-w-md"
        style={{
          background: "#000",
          border: "1px solid #333",
          color: "#fff",
          padding: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div className="jb-eyebrow">JABAL updates</div>
        <h2
          id="marketing-consent-title"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 300,
            lineHeight: 1.15,
            marginTop: 8,
          }}
        >
          Get JABAL updates?
        </h2>
        <p style={{ marginTop: 14, color: "#9a9a9a", fontSize: 14, lineHeight: 1.7 }}>
          Receive offers, launches, and restocks by email. You can unsubscribe anytime.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            style={{
              height: 48,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#b8b8b8",
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            style={{
              height: 48,
              border: "1px solid #fff",
              background: "#fff",
              color: "#000",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Saving" : "Yes, email me"}
          </button>
        </div>
      </div>
    </div>
  );
}
