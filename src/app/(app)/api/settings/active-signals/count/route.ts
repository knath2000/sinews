import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  try {
    const now = new Date();
    const count = await db.interest_signals.count({
      where: {
        user_id: auth.dbUser.id,
        OR: [{ expires_at: null }, { expires_at: { gte: now } }],
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to fetch active signals count:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
