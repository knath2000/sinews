import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/settings/brief-hour — returns user's configured brief hour
 * POST /api/settings/brief-hour — updates brief_ready_hour_local
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const profile = await db.user_profiles.findUnique({
    where: { user_id: dbUser.id },
    select: { brief_ready_hour_local: true },
  });

  return NextResponse.json({
    hour: profile?.brief_ready_hour_local ?? 4,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const body = await request.json().catch(() => null);
  if (body === null || typeof body.hour !== "number") {
    return NextResponse.json(
      { error: "Requires { hour: number }" },
      { status: 400 }
    );
  }

  const { hour } = body;
  if (hour < 0 || hour > 23) {
    return NextResponse.json(
      { error: "Hour must be between 0 and 23" },
      { status: 400 }
    );
  }

  await db.user_profiles.update({
    where: { user_id: dbUser.id },
    data: { brief_ready_hour_local: hour },
  });

  return NextResponse.json({ ok: true, hour });
}
