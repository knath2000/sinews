import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getSupabaseRuntimeConfig, SUPABASE_CONFIG_ERROR } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const config = getSupabaseRuntimeConfig();

  if (!config) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return createServerClient<Database>(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
