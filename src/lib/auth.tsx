import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

type AdminStatus = {
  userId: string;
  isAdmin: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);

  const currentUserId = user?.id ?? null;
  const isAdmin = Boolean(
    currentUserId && adminStatus?.userId === currentUserId && adminStatus.isAdmin,
  );
  const adminLoading = Boolean(currentUserId && adminStatus?.userId !== currentUserId);

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
    if (!currentUserId) {
      setAdminStatus(null);
      return;
    }

    let active = true;
    const checkedUserId = currentUserId;

    void supabase.rpc("is_admin").then(({ data, error }) => {
      if (!active) return;
      setAdminStatus({
        userId: checkedUserId,
        isAdmin: !error && data === true,
      });
    });

    // RPCs enforce admin access server-side. Rechecking on a timer or window focus
    // briefly replaced the admin UI with its loading screen and discarded local edits.
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdminStatus(null);
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
