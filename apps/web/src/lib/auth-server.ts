import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/auth";
import { getSupabaseRuntimeConfig, SUPABASE_CONFIG_ERROR } from "@/lib/supabase/env";

/**
 * Server-side auth helper for API routes.
 * Resolves the authenticated Supabase user and ensures a corresponding
 * DB record exists. Returns { supabase, dbUser, isAdmin } on success, or a
 * 401 Response on failure.
 *
 * Usage in a route handler:
 *
 *   const auth = await requireAuth();
 *   if ("status" in auth) return auth; // 401
 *   const { supabase, dbUser, isAdmin } = auth;
 */
export async function requireAuth() {
  if (!getSupabaseRuntimeConfig()) {
    return NextResponse.json({ error: SUPABASE_CONFIG_ERROR }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await ensureUser(user.id, user.email ?? "");

  return { supabase, dbUser, isAdmin: dbUser.isAdmin };
}
