import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { fetchActivePopupOffer, getOfferCopy, type Offer } from "@/lib/offer";
import { useAuth } from "@/lib/auth";
import { JABAL_LOGO_URL } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

const KEY = "jabal_offer_popup_dismissed";

export function OfferPopup() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { lang, t } = useI18n();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);
  const suppressOnAuthPage = [
    "/login",
    "/register",
    "/forgot",
    "/reset-password",
    "/auth/callback",
  ].includes(location.pathname);

  useEffect(() => {
    if (loading || user || suppressOnAuthPage) {
      setOpen(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // Ignore storage access issues in private browsing modes.
    }
    if (dismissed) return;
    let t: ReturnType<typeof setTimeout>;
    fetchActivePopupOffer().then((o) => {
      if (!o) return;
      setOffer(o);
      t = setTimeout(() => setOpen(true), 2000);
    });
    return () => {
      if (t) clearTimeout(t);
    };
  }, [user, loading, suppressOnAuthPage]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Ignore storage access issues in private browsing modes.
    }
  };

  if (suppressOnAuthPage || !open || !offer) return null;

  const copy = getOfferCopy(offer, lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#000",
          border: "1px solid #fff",
          padding: "40px 32px",
          position: "relative",
          color: "#fff",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <button
          aria-label="Close"
          onClick={close}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: 8,
          }}
        >
          ×
        </button>
        <div style={{ textAlign: "center" }}>
          <img
            src={JABAL_LOGO_URL}
            alt="JABAL"
            style={{ height: 36, margin: "0 auto 20px", filter: "invert(1) brightness(2)" }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#9a9a9a",
              marginBottom: 12,
            }}
          >
            {t("offer.exclusive")}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
            {copy.title}
          </h2>
          {copy.description && (
            <p style={{ fontSize: 13, color: "#9a9a9a", marginTop: 12, lineHeight: 1.6 }}>
              {copy.description}
            </p>
          )}
        </div>

        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/register" onClick={close} className="jb-btn" style={{ width: "100%" }}>
            {t("offer.emailSignup")}
          </Link>
          <Link
            to="/register"
            search={{ google: 1 } as never}
            onClick={close}
            className="jb-btn-ghost"
            style={{ width: "100%" }}
          >
            {t("offer.googleSignup")}
          </Link>
        </div>
      </div>
    </div>
  );
}
