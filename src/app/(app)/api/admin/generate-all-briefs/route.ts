import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { generateDailyBriefForUser } from "@/server/brief-engine";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    // Find all active users with profiles
    const users = await db.users.findMany({
      select: { id: true, email: true },
      where: {
        user_profiles: { isNot: null },
      },
    });

    if (users.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "No active users found.",
      });
    }

    const generated: string[] = [];
    const failed: string[] = [];

    // Sequentially generate briefs to avoid DB connection exhaustion
    for (const user of users) {
      try {
        await generateDailyBriefForUser(user.id);
        generated.push(user.email);
      } catch (err) {
        logError("admin-generate-all-briefs", err, {
          userId: user.id,
          email: user.email,
        });
        failed.push(user.email);
      }
    }

    return NextResponse.json({
      status: "complete",
      message: `Generated ${generated.length}/${users.length} briefs.`,
      generated_count: generated.length,
      failed_count: failed.length,
      failed_users: failed.slice(0, 10),
    });
  } catch (error) {
    logError("admin-generate-all-briefs-catch", error);
    return NextResponse.json(
      { error: "Failed to generate briefs" },
      { status: 500 },
    );
  }
}
