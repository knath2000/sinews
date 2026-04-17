"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseRuntimeConfig } from "@/lib/supabase/env";
import type { Session } from "@supabase/supabase-js";

type SupabaseContextValue = {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  configured: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = hasSupabaseRuntimeConfig();

  const refreshSession = async () => {
    if (!configured) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const client = createClient();
      const {
        data: { session: s },
      } = await client.auth.getSession();
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!configured) {
      setSession(null);
      setLoading(false);
      return;
    }

    const client = createClient();

    // Get initial session
    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s: Session | null) => {
      setSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  return (
    <SupabaseContext.Provider value={{ session, loading, refreshSession, configured }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
}
