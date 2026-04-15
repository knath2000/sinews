import { NextResponse } from "next/server";
import { requireAuth } from "./auth-server";

/**
 * Require admin authentication.
 * Returns 401 if not authenticated, 403 if not an admin.
 *
 * Usage:
 *   const auth = await requireAdmin();
 *   if ("status" in auth) return auth;
 *   const { supabase, dbUser } = auth;
 */
export async function requireAdmin() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden — admin access required" },
      { status: 403 }
    );
  }

  return auth;
}
