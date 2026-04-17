import { NextResponse } from "next/server";
import { submitFeedback } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import { logError } from "@/server/error-logger";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;
  let briefItemId: number | undefined;

  // Rate limit: 60 requests per 60 seconds per user
  const rl = await applyRateLimit(
    request as any,
    "feedback",
    { limit: 60, windowMs: 60_000, identifyBy: "user" },
  );
  if (rl) return rl;

  try {
    const body = await request.json();
    const { briefItemId: parsedBriefItemId, eventType, articleId } = body as {
      briefItemId: number;
      eventType: "thumbs_up" | "thumbs_down";
      articleId: number;
    };
    briefItemId = parsedBriefItemId;

    if (!briefItemId || !eventType) {
      return NextResponse.json(
        { error: "briefItemId and eventType are required" },
        { status: 400 }
      );
    }

    await submitFeedback(dbUser.id, briefItemId, eventType, articleId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("feedback", error, { userId: dbUser.id, briefItemId });
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
