import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { inngest } from "@/server/inngest/client";
import { logError } from "@/server/error-logger";

/**
 * POST /api/admin/ingest/run
 * Admin-only route to manually trigger an ingestion via Inngest.
 */
export async function POST() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    await inngest.send({
      name: "ingest.manual",
      data: { triggered_by: "admin" },
    });

    return NextResponse.json({ status: "queued" });
  } catch (error) {
    logError("admin-ingest-queue", error);
    return NextResponse.json(
      { error: "Failed to enqueue ingestion event" },
      { status: 500 },
    );
  }
}
