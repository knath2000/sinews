import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/auth";
import { db } from "@/server/db/client";

/**
 * GET /api/me
 * Returns current user, profile, linked accounts, onboarding state.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await ensureUser(session.user.id, session.user.email ?? "");

    // Fetch topic preferences
    const topicPreferences = await db.user_topic_preferences.findMany({
      where: { user_id: user.id, source: "manual_topic" },
      select: { topic: true, weight: true },
    });

    // Fetch linked accounts
    const linkedAccounts = await db.linked_accounts.findMany({
      where: { user_id: user.id },
      select: { provider: true, status: true },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: user.profile,
      topicPreferences: topicPreferences.map((p) => ({
        topic: p.topic,
        weight: p.weight,
      })),
      linkedAccounts: linkedAccounts.map((a) => ({
        provider: a.provider,
        status: a.status,
      })),
      onboardingComplete: user.profile?.onboarding_complete ?? false,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
