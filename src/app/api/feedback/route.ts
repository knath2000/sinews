import { NextResponse } from "next/server";
import { submitFeedback } from "@/server/feed-loader";

export async function POST(request: Request) {
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

    // TODO: wire up real user authentication
    const demoUserId = process.env.DEMO_USER_ID || "demo-user";

    await submitFeedback(demoUserId, briefItemId, eventType, articleId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
