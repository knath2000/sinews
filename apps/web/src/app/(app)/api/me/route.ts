import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";

/**
 * GET /api/me
 * Returns current user, profile, linked accounts, onboarding state.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  try {
    // Fetch topic preferences
    const topicPreferences = await db.user_topic_preferences.findMany({
      where: { user_id: dbUser.id, source: "manual_topic" },
      select: { topic: true, weight: true },
    });

    // Fetch linked accounts
    const linkedAccounts = await db.linked_accounts.findMany({
      where: { user_id: dbUser.id },
      select: { provider: true, status: true },
    });

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
      },
      profile: dbUser.profile,
      isAdmin: dbUser.isAdmin,
      topicPreferences: topicPreferences.map((p) => ({
        topic: p.topic,
        weight: p.weight,
      })),
      linkedAccounts: linkedAccounts.map((a) => ({
        provider: a.provider,
        status: a.status,
      })),
      onboardingComplete: dbUser.profile?.onboarding_complete ?? false,
    });
  } catch (error) {
    logError("me", error, { userId: dbUser.id });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
