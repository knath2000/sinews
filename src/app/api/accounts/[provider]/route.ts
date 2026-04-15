import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

/**
 * DELETE /api/accounts/:provider — disconnect and purge tokens for a provider.
 * Sets tokens to null, marks as disconnected, records disconnection time.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!provider || !["x", "google"].includes(provider)) {
    return NextResponse.json(
      { error: "Valid provider required (x or google)" },
      { status: 400 }
    );
  }

  // TODO: resolve actual user_id from session
  const userId = "demo-user";

  const result = await db.linked_accounts.updateMany({
    where: {
      user_id: userId,
      provider,
      status: "active",
    },
    data: {
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      status: "disconnected",
      token_invalidated_at: new Date(),
      sync_error_code: "user_disconnected",
      sync_error_at: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "No active connection found for this provider" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, disconnected: provider });
}
