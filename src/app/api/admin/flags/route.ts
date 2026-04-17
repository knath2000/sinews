import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { db } from "@/server/db/client";
import { FLAG_KEYS, type FlagKey } from "@/lib/flags";
import { invalidateFlagCache } from "@/server/feature-flags";
import { logError } from "@/server/error-logger";

/**
 * POST /api/admin/flags
 * Admin-only endpoint to toggle a feature flag.
 *
 * Body: { flagKey: "enable_x_sync", enabled: true }
 * Upserts into the feature_flags table and invalidates the local cache.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    const flags = await db.feature_flags.findMany({
      select: { flag_key: true, enabled: true },
    });

    return NextResponse.json({ flags });
  } catch (error) {
    logError("admin-list-flags", error);
    return NextResponse.json(
      { error: "Failed to list flags" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.flagKey !== "string") {
    return NextResponse.json(
      { error: "Body must contain { flagKey: string, enabled: boolean }" },
      { status: 400 },
    );
  }

  const { flagKey, enabled } = body as { flagKey: string; enabled: boolean };

  // Validate the flag key
  if (!(flagKey in FLAG_KEYS)) {
    return NextResponse.json(
      {
        error: `Unknown flag key: ${flagKey}`,
        validKeys: Object.keys(FLAG_KEYS),
      },
      { status: 400 },
    );
  }

  try {
    // Upsert the flag value
    const updated = await db.feature_flags.upsert({
      where: { flag_key: flagKey },
      update: { enabled },
      create: { flag_key: flagKey, enabled },
    });

    // Invalidate local cache so the change is visible within 30s
    invalidateFlagCache(flagKey as FlagKey);

    return NextResponse.json({
      flagKey: updated.flag_key,
      previousValue: enabled ? !updated.enabled : updated.enabled,
      newValue: updated.enabled,
    });
  } catch (error) {
    logError("admin-update-flag", error, { flagKey });
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 },
    );
  }
}
