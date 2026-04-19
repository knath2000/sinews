import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { CURRENT_CONSENT_VERSION } from "@/lib/constants";

/**
 * GET /api/settings/consent — returns current consent state
 * POST /api/settings/consent — accepts current consent version
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const profile = await db.user_profiles.findUnique({
    where: { user_id: dbUser.id },
    select: { consent_version_accepted: true },
  });

  return NextResponse.json({
    currentVersion: CURRENT_CONSENT_VERSION,
    acceptedVersion: profile?.consent_version_accepted ?? null,
    isCurrent: (profile?.consent_version_accepted ?? null) === CURRENT_CONSENT_VERSION,
  });
}

export async function POST() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  await db.user_profiles.update({
    where: { user_id: dbUser.id },
    data: { consent_version_accepted: CURRENT_CONSENT_VERSION },
  });

  return NextResponse.json({ ok: true, version: CURRENT_CONSENT_VERSION });
}
