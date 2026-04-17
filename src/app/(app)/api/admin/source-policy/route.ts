import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";

/**
 * GET /api/admin/source-policy
 * Admin-only route to list all source policies.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    const policies = await db.source_policies.findMany({
      orderBy: { source_name: "asc" },
    });

    return NextResponse.json({
      policies: policies.map((p) => ({
        sourceName: p.source_name,
        enabled: p.enabled,
        qualityFloor: p.quality_floor,
        licenseClass: p.license_class,
      })),
    });
  } catch (error) {
    logError("admin-list-source-policies", error);
    return NextResponse.json(
      { error: "Failed to list source policies" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/source-policy
 * Admin-only route to upsert source_policies entries.
 *
 * Body: { sourceName: string; enabled?: boolean; qualityFloor?: number }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.sourceName !== "string") {
    return NextResponse.json(
      { error: "Body must contain { sourceName: string }" },
      { status: 400 },
    );
  }

  const { sourceName, enabled, qualityFloor } = body as {
    sourceName: string;
    enabled?: boolean;
    qualityFloor?: number;
  };

  if (qualityFloor !== undefined && (qualityFloor < 1 || qualityFloor > 5)) {
    return NextResponse.json(
      { error: "qualityFloor must be between 1 and 5" },
      { status: 400 },
    );
  }

  try {
    const updated = await db.source_policies.upsert({
      where: { source_name: sourceName },
      update: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(qualityFloor !== undefined ? { quality_floor: qualityFloor } : {}),
      },
      create: {
        source_name: sourceName,
        enabled: enabled ?? true,
        quality_floor: qualityFloor ?? 2,
      },
    });

    return NextResponse.json({
      sourceName: updated.source_name,
      enabled: updated.enabled,
      qualityFloor: updated.quality_floor,
    });
  } catch (error) {
    logError("admin-upsert-source-policy", error, { sourceName });
    return NextResponse.json(
      { error: "Failed to upsert source policy" },
      { status: 500 },
    );
  }
}
