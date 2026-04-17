import { NextResponse } from "next/server";
import { submitFeedbackAndSignals, findReplacementArticle } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import { logError } from "@/server/error-logger";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;
  let briefItemId: number | undefined;

  // Generic feedback rate limit: 60 requests per 60 seconds
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

    // Stricter limit for thumbs_down (replacement work): 10 per hour
    if (eventType === "thumbs_down") {
      const downRl = await applyRateLimit(
        request as any,
        "feedback-down",
        { limit: 10, windowMs: 60 * 60 * 1000, identifyBy: "user" },
      );
      if (downRl) return downRl;
    }

    // Persist the feedback event and derived interest signals
    await submitFeedbackAndSignals(dbUser.id, briefItemId, eventType, articleId);

    // For thumbs_down: attempt an immediate one-slot replacement
    if (eventType === "thumbs_down") {
      const result = await findReplacementArticle(
        dbUser.id,
        briefItemId,
        articleId
      );

      if (result !== null) {
        return NextResponse.json({
          ok: true,
          recorded: true,
          replaced: true,
          article: result,
        });
      }
    }

    return NextResponse.json({ ok: true, recorded: true, replaced: false });
  } catch (error) {
    logError("feedback", error, { userId: dbUser.id, briefItemId });
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
