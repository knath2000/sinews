import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { inngest } from "@/server/inngest/client";

/**
 * POST /api/admin/account-resync
 * Admin-only route to emit an 'account.resync' event via Inngest.
 *
 * Body: { userId: string; provider: string }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.userId !== "string" ||
    typeof body.provider !== "string"
  ) {
    return NextResponse.json(
      { error: "Body must contain { userId: string, provider: string }" },
      { status: 400 },
    );
  }

  const { userId, provider } = body as { userId: string; provider: string };

  try {
    await inngest.send({
      name: "account.resync",
      data: { user_id: userId, provider },
    });

    return NextResponse.json({
      status: "queued",
      user_id: userId,
      provider,
    });
  } catch (error) {
    console.error("Error sending account.ressync event:", error);
    return NextResponse.json(
      { error: "Failed to enqueue account resync event" },
      { status: 500 },
    );
  }
}
