import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseRuntimeConfig, SUPABASE_CONFIG_ERROR } from "./env";

export const createClient = () => {
  const config = getSupabaseRuntimeConfig();

  if (!config) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return createBrowserClient(config.url, config.anonKey);
};
