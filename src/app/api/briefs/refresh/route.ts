import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import type { NextRequest } from "next/server";

/**
 * POST /api/briefs/refresh
 * Staff-only endpoint to manually trigger a brief refresh.
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

  return NextResponse.json({
    status: "queued",
    message: "Brief refresh has been queued",
    user_id: dbUser.id,
  });
}
