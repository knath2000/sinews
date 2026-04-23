import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/auth";
import { getSupabaseRuntimeConfig, SUPABASE_CONFIG_ERROR } from "@/lib/supabase/env";

/**
 * Server-side auth helper for API routes.
 * Resolves the authenticated Supabase user and ensures a corresponding
 * DB record exists. Returns { supabase, dbUser, isAdmin } on success, or a
 * 401 Response on failure.
 *
 * Supports two auth modes:
 * 1. Bearer token (mobile clients) — reads Authorization header
 * 2. Cookie (web clients) — reads Supabase SSR cookies
 *
 * Usage in a route handler:
 *
 *   const auth = await requireAuth();
 *   if ("status" in auth) return auth; // 401
 *   const { supabase, dbUser, isAdmin } = auth;
 */
export async function requireAuth() {
  const config = getSupabaseRuntimeConfig();
  if (!config) {
    return NextResponse.json({ error: SUPABASE_CONFIG_ERROR }, { status: 503 });
  }

  // Mode 1: Bearer token (mobile / API clients)
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createSupabaseClient(config.url, config.anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await ensureUser(data.user.id, data.user.email ?? "");

    return {
      supabase,
      dbUser,
      isAdmin: dbUser.isAdmin,
      authMode: "bearer" as const,
    };
  }

  // Mode 2: Cookie-based (web clients)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await ensureUser(user.id, user.email ?? "");

  return { supabase, dbUser, isAdmin: dbUser.isAdmin, authMode: "cookie" as const };
}
