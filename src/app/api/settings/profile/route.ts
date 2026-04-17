import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/settings/profile — returns user's display name and timezone.
 * PATCH /api/settings/profile — updates display name and/or timezone.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const displayName = dbUser.profile?.displayName ?? "";

  // Get timezone from the database
  const userRecord = await db.users.findUnique({
    where: { id: dbUser.id },
    select: { timezone: true },
  });
  const timezone = userRecord?.timezone ?? "America/Los_Angeles";

  return NextResponse.json({
    displayName,
    timezone,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";

  if (displayName.length === 0 && timezone.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    if (displayName.length > 0) {
      await tx.user_profiles.upsert({
        where: { user_id: dbUser.id },
        create: { user_id: dbUser.id, display_name: displayName },
        update: { display_name: displayName },
      });
    }

    if (timezone.length > 0) {
      await tx.users.update({
        where: { id: dbUser.id },
        data: { timezone },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
