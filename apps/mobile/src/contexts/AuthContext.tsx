import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Module-level auth singleton — accessible regardless of React tree
let currentSession: Session | null = null;
let currentUser: User | null = null;
let loading = true;

const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

function setAuthState(session: Session | null) {
  currentSession = session;
  currentUser = session?.user ?? null;
  loading = false;
  notifyAll();
  console.log('[Auth] state updated:', session?.user?.email ?? 'no session');
}

// Initialize on module load with timeout to prevent hanging
async function initializeAuth() {
  console.log('[Auth] initializing, configured:', isSupabaseConfigured, 'url:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (!isSupabaseConfigured) {
    loading = false;
    notifyAll();
    return;
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Auth init timed out')), 5000)
  );

  try {
    await Promise.race([
      (async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession returned:', session ? 'session' : 'null', error?.message ?? '');
        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.log('[Auth] session invalid, clearing:', userError?.message);
            await supabase.auth.signOut();
            setAuthState(null);
          } else {
            setAuthState(session);
          }
        } else {
          setAuthState(null);
        }
      })(),
      timeout,
    ]);
  } catch (e) {
    console.log('[Auth] init failed:', e);
    setAuthState(null);
  }
}

initializeAuth();

supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Auth] onAuthStateChange:', event, session?.user?.email ?? 'no session');
  setAuthState(session);
});

// Auth functions (no React dependency)
export async function authSignIn(email: string, password: string) {
  console.log('[Auth] signing in:', email);
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[Auth] signIn result:', data.session ? 'session received' : 'no session', error?.message ?? 'no error');
    return { error: error?.message ?? null };
  } catch (e) {
    console.log('[Auth] signIn threw:', e);
    return { error: String(e) };
  }
}

export async function authSignUp(email: string, password: string) {
  console.log('[Auth] signing up:', email);
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local', needsConfirmation: false };
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    const needsConfirmation = !data.session && !error;
    console.log('[Auth] signUp result:', error?.message ?? 'no error', needsConfirmation ? 'needs confirmation' : 'session received');
    return { error: error?.message ?? null, needsConfirmation };
  } catch (e) {
    console.log('[Auth] signUp threw:', e);
    return { error: String(e), needsConfirmation: false };
  }
}

export async function authSignOut() {
  console.log('[Auth] signOut');
  setAuthState(null);
  if (!isSupabaseConfigured) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.log('[Auth] signOut error:', e);
  }
}

export async function authResetPassword(email: string) {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'ai-news-mobile://auth/confirm',
  });
  return { error: error?.message ?? null };
}

// React hook — subscribes to auth state changes
export function useAuthState() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: currentSession,
    user: currentUser,
    isLoading: loading,
  };
}
