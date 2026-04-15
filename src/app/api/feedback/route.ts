import { NextResponse } from "next/server";
import { submitFeedback } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  try {
    const body = await request.json();
    const { briefItemId, eventType, articleId } = body as {
      briefItemId: number;
      eventType: "thumbs_up" | "thumbs_down";
      articleId: number;
    };

    if (!briefItemId || !eventType) {
      return NextResponse.json(
        { error: "briefItemId and eventType are required" },
        { status: 400 }
      );
    }

    await submitFeedback(dbUser.id, briefItemId, eventType, articleId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
