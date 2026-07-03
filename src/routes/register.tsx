import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { upsertProfile } from "@/lib/profile";
import { recordMarketingConsent } from "@/lib/marketing";
import { useI18n } from "@/lib/i18n";

const PENDING_MARKETING_CONSENT_KEY = "pendingMarketingConsent";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({ google: s.google ? 1 : undefined }),
  head: () => ({ meta: [{ title: "Register — JABAL" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { google } = Route.useSearch();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (google) googleSignup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const googleSignup = async () => {
    if (marketingOptIn) {
      localStorage.setItem(PENDING_MARKETING_CONSENT_KEY, "1");
    } else {
      localStorage.removeItem(PENDING_MARKETING_CONSENT_KEY);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
        skipBrowserRedirect: true,
      },
    });
    if (error) setErr(error.message);
    else if (data.url) window.location.assign(data.url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (data.user) {
      await upsertProfile({
        user_id: data.user.id,
        first_name: firstName || null,
        last_name: lastName || null,
        email,
        phone: null,
        full_address: null,
        city: null,
        governorate: null,
      });
      if (marketingOptIn) {
        await recordMarketingConsent({
          email,
          userId: data.user.id,
          source: "register",
        });
      }
    }
    if (data.session) navigate({ to: "/account" });
    else setMsg(t("auth.checkEmail"));
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="jb-eyebrow">{t("account.eyebrow")}</div>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 300,
            marginTop: 6,
            color: "#fff",
          }}
        >
          {t("auth.create.title")}
        </h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="jb-label">{t("form.first")}</label>
              <input
                className="jb-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="jb-label">{t("form.last")}</label>
              <input
                className="jb-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="jb-label">{t("form.email")}</label>
            <input
              type="email"
              className="jb-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="jb-label">{t("auth.password")}</label>
            <input
              type="password"
              className="jb-input"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label
            className="flex items-start gap-3"
            style={{ fontSize: 12, lineHeight: 1.6, color: "#9a9a9a" }}
          >
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>{t("marketing.optIn")}</span>
          </label>
          {err && (
            <div
              style={{
                border: "1px solid #fff",
                padding: "10px 14px",
                fontSize: 12,
                color: "#fff",
              }}
            >
              {err}
            </div>
          )}
          {msg && (
            <div
              style={{
                border: "1px solid #fff",
                padding: "10px 14px",
                fontSize: 12,
                color: "#fff",
              }}
            >
              {msg}
            </div>
          )}
          <button type="submit" disabled={busy} className="jb-btn w-full">
            {busy ? t("auth.creating") : t("auth.create.title")}
          </button>
        </form>
        <button onClick={googleSignup} className="jb-btn-ghost w-full mt-3">
          {t("auth.google")}
        </button>
        <div
          className="mt-6 text-center"
          style={{
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#9a9a9a",
          }}
        >
          {t("auth.already")}{" "}
          <Link to="/login" className="hover:underline" style={{ color: "#fff" }}>
            {t("auth.login.title")}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
