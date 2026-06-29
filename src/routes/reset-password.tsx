import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "New password — JABAL" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate({ to: "/account" });
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="jb-eyebrow">Account</div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 300, marginTop: 6, color: "#fff" }}>Set new password</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="jb-label">New password</label>
            <input type="password" className="jb-input" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div style={{ border: "1px solid #fff", padding: "10px 14px", fontSize: 12, color: "#fff" }}>{err}</div>}
          <button type="submit" disabled={busy} className="jb-btn w-full">{busy ? "Saving…" : "Update password"}</button>
        </form>
      </div>
    </Layout>
  );
}
