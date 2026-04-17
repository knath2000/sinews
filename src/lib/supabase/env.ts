export const SUPABASE_CONFIG_ERROR =
  "Authentication is not configured for this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Production, then redeploy.";

export type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseRuntimeConfig(): boolean {
  return getSupabaseRuntimeConfig() !== null;
}

