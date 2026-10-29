"use client";

// Keeps track of who is signed in, and guards pages that need an account.

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Renders children only when signed in; otherwise sends the visitor to sign in. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : path;
      router.replace(`/signin?next=${encodeURIComponent(next)}`);
    }
  }, [loading, session, router, path]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Checking your session">
        <Spinner className="h-5 w-5 text-brand" />
      </div>
    );
  }
  return <>{children}</>;
}
