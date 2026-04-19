import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { generateDailyBriefForUser } from "@/server/brief-engine";
import { applyRateLimit } from "@/middleware/rate-limit";
import type { NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";
import { getUserBriefDateRangeFromTz } from "@/lib/brief-date";

/**
 * POST /api/briefs/refresh
 * Staff-only endpoint to delete today's brief and regenerate it.
 * Rate limited to 5 requests per 60 seconds per user.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser, isAdmin } = auth;

  // Admin gate — staff only
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden — staff access required" },
      { status: 403 },
    );
  }

  // Rate limit: 5 requests per 60 seconds per user
  const rl = await applyRateLimit(request, "briefs-refresh", {
    limit: 5,
    windowMs: 60_000,
    identifyBy: "user",
  });
  if (rl) return rl;

  try {
    // Delete any existing brief for today (user-local date)
    const today = getUserBriefDateRangeFromTz(dbUser.timezone);
    await db.daily_briefs.deleteMany({
      where: {
        user_id: dbUser.id,
        brief_date: today,
      },
    });

    // Regenerate the brief
    const result = await generateDailyBriefForUser(dbUser.id);

    return NextResponse.json({
      status: "generating",
      brief_id: result.brief_id,
    });
  } catch (err) {
    logError("briefs-refresh", err, { userId: dbUser.id });
    return NextResponse.json(
      { error: "Brief refresh failed" },
      { status: 500 },
    );
  }
}
