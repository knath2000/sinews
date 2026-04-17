import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { isFeatureEnabled } from "@/server/feature-flags";
import { db } from "@/server/db/client";
import { getSignedUploadUrl } from "@/server/history-import/storage";
import { HISTORY_IMPORT_MAX_UPLOAD_BYTES } from "@/lib/constants";
import { logError } from "@/server/error-logger";
import {
  buildSafariImportSummary,
  type SafariImportSummary,
} from "@/lib/safari-insights";
import { SUPABASE_CONFIG_ERROR } from "@/lib/supabase/env";

// GET: Return latest import for user
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  try {
    const latest = await db.history_imports.findFirst({
      where: { user_id: auth.dbUser.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        source_type: true,
        browser: true,
        raw_file_name: true,
        schema_version: true,
        visit_count: true,
        accepted_count: true,
        rejected_count: true,
        preview_json: true,
        created_at: true,
        confirmed_at: true,
      },
    });

    let summary: SafariImportSummary | null = null;
    if (latest?.status === "confirmed") {
      const activeSignalFilter = {
        user_id: auth.dbUser.id,
        provider: "history_import",
        signal_type: "safari_history_import",
        OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
      };

      const [topicGroups, domainGroups] = await Promise.all([
        db.interest_signals.groupBy({
          by: ["normalized_topic"],
          where: {
            ...activeSignalFilter,
            normalized_topic: { not: null },
          },
          _count: { _all: true },
          _sum: { weight: true },
          orderBy: {
            _sum: { weight: "desc" },
          },
          take: 5,
        }),
        db.interest_signals.groupBy({
          by: ["raw_value"],
          where: {
            ...activeSignalFilter,
            raw_value: { not: null },
          },
          _count: { _all: true },
          _sum: { weight: true },
          orderBy: {
            _sum: { weight: "desc" },
          },
          take: 5,
        }),
      ]);

      summary = buildSafariImportSummary({
        acceptedCount: latest.accepted_count ?? 0,
        topics: topicGroups
          .filter((row) => row.normalized_topic)
          .map((row) => ({
            label: row.normalized_topic as string,
            count: row._count._all,
            weight: row._sum.weight ?? 0,
          })),
        domains: domainGroups
          .filter((row) => row.raw_value)
          .map((row) => ({
            label: row.raw_value as string,
            count: row._count._all,
            weight: row._sum.weight ?? 0,
          })),
      });
    }

    return NextResponse.json({
      import: latest ? { ...latest, summary } : null,
    });
  } catch (error) {
    logError("history-import-list", error, { userId: auth.dbUser.id });
    return NextResponse.json(
      { error: "Failed to load Safari imports" },
      { status: 500 }
    );
  }
}

// POST /create: Create new import record + signed upload URL
export async function POST() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  const enabled = await isFeatureEnabled("enable_safari_history_import");
  if (!enabled) {
    return NextResponse.json({ error: "Safari history import is not enabled" }, { status: 403 });
  }

  try {
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1_000);

    const created = await db.history_imports.create({
      data: {
        user_id: auth.dbUser.id,
        status: "pending_upload",
        source_type: "safari_zip",
        browser: "safari",
        expires_at,
      },
    });

    const { signedUrl, token, path } = await getSignedUploadUrl(auth.dbUser.id, created.id);

    return NextResponse.json({
      importId: created.id,
      signedUrl,
      token,
      path,
      maxBytes: HISTORY_IMPORT_MAX_UPLOAD_BYTES,
    });
  } catch (error) {
    logError("history-import-create", error, { userId: auth.dbUser.id });
    if (
      error instanceof Error &&
      error.message.includes("Supabase admin client requires")
    ) {
      return NextResponse.json({ error: SUPABASE_CONFIG_ERROR }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to create Safari import" },
      { status: 500 }
    );
  }
}
