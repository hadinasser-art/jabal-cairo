import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const refreshAdminStatus = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      setAdminLoading(false);
      return false;
    }

    setAdminLoading(true);
    const { data, error } = await supabase.rpc("is_admin");
    const nextIsAdmin = !error && data === true;
    setIsAdmin(nextIsAdmin);
    setAdminLoading(false);
    return nextIsAdmin;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;

    refreshAdminStatus(user).then(() => {
      if (!alive) return;
    });

    return () => {
      alive = false;
    };
  }, [user, refreshAdminStatus]);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      if (document.visibilityState === "visible") refreshAdminStatus(user);
    };
    const interval = window.setInterval(refresh, 30000);

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user, refreshAdminStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminLoading(false);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, adminLoading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
