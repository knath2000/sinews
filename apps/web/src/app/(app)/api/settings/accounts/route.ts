import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/settings/accounts — returns linked accounts with status.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const accounts = await db.linked_accounts.findMany({
    where: { user_id: dbUser.id },
    select: {
      provider: true,
      status: true,
      expires_at: true,
      last_sync_at: true,
    },
  });

  return NextResponse.json({ accounts });
}
