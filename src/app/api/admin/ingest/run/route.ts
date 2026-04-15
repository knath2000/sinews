import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { inngest } from "@/server/inngest/client";

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
    console.error("Error sending ingest.manual event:", error);
    return NextResponse.json(
      { error: "Failed to enqueue ingestion event" },
      { status: 500 },
    );
  }
}
