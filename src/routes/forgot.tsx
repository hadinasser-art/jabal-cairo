import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot")({
  head: () => ({ meta: [{ title: "Reset password — JABAL" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("If an account exists for that email, a reset link is on its way.");
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="jb-eyebrow">Account</div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 300, marginTop: 6, color: "#fff" }}>Reset password</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="jb-label">Email</label>
            <input type="email" className="jb-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, color: "#fff" }}>{err}</div>}
          {msg && <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, color: "#fff" }}>{msg}</div>}
          <button type="submit" disabled={busy} className="jb-btn w-full">{busy ? "Sending…" : "Send reset link"}</button>
        </form>
        <div className="mt-6 text-center" style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a9a9a" }}>
          <Link to="/login" className="hover:underline" style={{ color: "#fff" }}>Back to login</Link>
        </div>
      </div>
    </Layout>
  );
}
