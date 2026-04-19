import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/settings/theme — returns user's dark mode preference.
 * PATCH /api/settings/theme — updates dark mode preference.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;
  return NextResponse.json({ darkMode: dbUser.profile?.darkMode ?? false });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const body = await request.json().catch(() => null);
  if (body === null || typeof body.darkMode !== "boolean") {
    return NextResponse.json({ error: "Requires { darkMode: boolean }" }, { status: 400 });
  }

  await db.user_profiles.upsert({
    where: { user_id: dbUser.id },
    create: { user_id: dbUser.id, dark_mode: body.darkMode },
    update: { dark_mode: body.darkMode },
  });

  return NextResponse.json({ ok: true, darkMode: body.darkMode });
}
