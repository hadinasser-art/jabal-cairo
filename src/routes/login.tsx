import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — JABAL" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate({ to: "/account" });
  };

  const google = async () => {
    setErr(null);
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
          {t("auth.login.title")}
        </h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
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
          <button type="submit" disabled={busy} className="jb-btn w-full">
            {busy ? t("auth.loggingIn") : t("auth.login.title")}
          </button>
        </form>
        <button onClick={google} className="jb-btn-ghost w-full mt-3">
          {t("auth.google")}
        </button>
        <div
          className="mt-6 flex justify-between"
          style={{
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#9a9a9a",
          }}
        >
          <Link to="/forgot" className="hover:underline">
            {t("auth.forgot")}
          </Link>
          <Link to="/register" search={{ google: undefined }} className="hover:underline">
            {t("auth.register")}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
