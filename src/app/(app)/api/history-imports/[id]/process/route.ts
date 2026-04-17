import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { isFeatureEnabled } from "@/server/feature-flags";
import { db } from "@/server/db/client";
import { deleteZip, streamDownload } from "@/server/history-import/storage";
import { parseSafariHistoryZip } from "@/server/history-import/safari-parser";
import { logError } from "@/server/error-logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  const enabled = await isFeatureEnabled("enable_safari_history_import");
  if (!enabled) {
    return NextResponse.json(
      { error: "Safari history import is not enabled" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { dbUser } = auth;

  const importRecord = await db.history_imports.findUnique({
    where: { id, user_id: dbUser.id },
  });

  if (!importRecord) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  if (importRecord.status !== "pending_upload") {
    return NextResponse.json(
      { error: `Import cannot be processed in status: ${importRecord.status}` },
      { status: 400 }
    );
  }

  await db.history_imports.update({
    where: { id },
    data: { status: "processing" },
  });

  let zipDeleted = false;

  try {
    const zipStream = await streamDownload(dbUser.id, id);
    const result = await parseSafariHistoryZip(zipStream, id);

    // Build preview JSON (aggregated only)
    const preview = {
      topDomains: result.topDomains,
      topicCounts: result.topicCounts,
      dateRange: result.dateRange,
      totalVisits: result.totalVisits,
      acceptedCount: result.acceptedVisits,
      rejectedCount: result.rejectedVisits,
      schemaVersion: result.schemaVersion,
    };

    // Update the import record
    await db.history_imports.update({
      where: { id },
      data: {
        status: "preview_ready",
        preview_json: JSON.stringify(preview),
        staged_signals_json: JSON.stringify(result.stagedSignals),
        visit_count: result.totalVisits,
        accepted_count: result.acceptedVisits,
        rejected_count: result.rejectedVisits,
        schema_version: String(result.schemaVersion),
        completed_at: new Date(),
      },
    });

    try {
      await deleteZip(dbUser.id, id);
      zipDeleted = true;
    } catch {
      // Best-effort cleanup, retry in finally.
    }

    return NextResponse.json({ ok: true, preview });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const code = err instanceof Error ? err.message : "PARSE_ERROR";

    logError("history-import-process", err, { importId: id, userId: dbUser.id, code });

    await db.history_imports.update({
      where: { id },
      data: { status: "failed", completed_at: new Date() },
    });

    await db.history_import_events.create({
      data: {
        history_import_id: id,
        level: "error",
        code,
        message,
      },
    });

    return NextResponse.json(
      { error: `Failed to process import: ${message}` },
      { status: 500 }
    );
  } finally {
    if (!zipDeleted) {
      try {
        await deleteZip(dbUser.id, id);
      } catch (cleanupError) {
        logError("history-import-delete-zip", cleanupError, { importId: id, userId: dbUser.id });
      }
    }
  }
}
