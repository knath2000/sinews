import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * POST /api/accounts/delete
 * Permanently deletes the authenticated user's account and all associated data.
 * Order of deletion (inside a Prisma transaction):
 *   1. interest_signals
 *   2. feedback_events
 *   3. daily_briefs    (cascades to daily_brief_items)
 *   4. linked_accounts
 *   5. user_topic_preferences
 *   6. user_profiles
 *   7. users
 * Also revokes Supabase auth session via admin API.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { supabase, dbUser } = auth;

  const userId = dbUser.id;

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete interest signals
      await tx.interest_signals.deleteMany({
        where: { user_id: userId },
      });

      // 2. Delete feedback events
      await tx.feedback_events.deleteMany({
        where: { user_id: userId },
      });

      // 3. Delete daily briefs (cascades to daily_brief_items via onDelete: Cascade in schema)
      await tx.daily_briefs.deleteMany({
        where: { user_id: userId },
      });

      // 4. Delete linked accounts
      await tx.linked_accounts.deleteMany({
        where: { user_id: userId },
      });

      // 5. Delete topic preferences
      await tx.user_topic_preferences.deleteMany({
        where: { user_id: userId },
      });

      // 6. Delete user profile
      await tx.user_profiles.delete({
        where: { user_id: userId },
      });

      // 7. Delete user
      await tx.users.delete({
        where: { id: userId },
      });
    });

    // Revoke Supabase auth
    try {
      const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseAdminUrl && supabaseServiceKey) {
        await fetch(
          `${supabaseAdminUrl}/admin/users/${userId}`,
          {
            method: "DELETE",
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }
        );
      }
    } catch (supabaseError) {
      // Log but don't fail the response — local DB user is already deleted
      console.warn(
        "Supabase user deletion failed (local DB user still deleted):",
        supabaseError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
