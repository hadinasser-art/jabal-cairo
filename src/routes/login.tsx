import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — JABAL" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate({ to: "/account" });
  };

  const google = async () => {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setErr(error.message);
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="jb-eyebrow">Account</div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 300, marginTop: 6, color: "#fff" }}>Log in</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="jb-label">Email</label>
            <input type="email" className="jb-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="jb-label">Password</label>
            <input type="password" className="jb-input" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, color: "#fff" }}>{err}</div>}
          <button type="submit" disabled={busy} className="jb-btn w-full">{busy ? "Logging in…" : "Log in"}</button>
        </form>
        <button onClick={google} className="jb-btn-ghost w-full mt-3">Continue with Google</button>
        <div className="mt-6 flex justify-between" style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a" }}>
          <Link to="/forgot" className="hover:underline">Forgot password</Link>
          <Link to="/register" className="hover:underline">Register</Link>
        </div>
      </div>
    </Layout>
  );
}
