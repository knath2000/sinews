import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";
import { MIN_TOPIC_SELECTIONS, CURRENT_CONSENT_VERSION } from "@/lib/constants";

/**
 * POST /api/onboarding
 * Save selected (at least 5) topics and the user's timezone.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  if (dbUser.profile?.onboarding_complete) {
    return NextResponse.json(
      { error: "Onboarding already complete" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const topics: string[] = body.topics;
    const timezone: string = body.timezone;

    // Validate timezone
    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json(
        { error: "Timezone is required" },
        { status: 400 }
      );
    }

    // Validate minimum topic selections
    if (!topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: "Topics must be an array" },
        { status: 400 }
      );
    }

    if (topics.length < MIN_TOPIC_SELECTIONS) {
      return NextResponse.json(
        { error: `Please select at least ${MIN_TOPIC_SELECTIONS} topics` },
        { status: 400 }
      );
    }

    // Validate topics against taxonomy (case-insensitive)
    const validTopics = new Set(TOPIC_TAXONOMY.map((t) => t.toLowerCase()));
    const invalidTopics = topics.filter(
      (t: string) => !validTopics.has(t.toLowerCase())
    );
    if (invalidTopics.length > 0) {
      return NextResponse.json(
        { error: `Invalid topics: ${invalidTopics.join(", ")}` },
        { status: 400 }
      );
    }

    // Deduplicate topics
    const uniqueTopics = [...new Set(topics.map((t: string) => t.toLowerCase()))];

    // Save topics and update profile in a transaction
    await db.$transaction(async (tx) => {
      // Upsert topic preferences
      await tx.user_topic_preferences.createMany({
        data: uniqueTopics.map((topic) => ({
          user_id: dbUser.id,
          topic,
          weight: 1.0,
          source: "manual_topic",
        })),
        skipDuplicates: true,
      });

      // Mark onboarding as complete
      await tx.user_profiles.update({
        where: { user_id: dbUser.id },
        data: {
          onboarding_complete: true,
          consent_version_accepted: CURRENT_CONSENT_VERSION,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding complete",
    });
  } catch (error) {
    console.error("Error saving onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
