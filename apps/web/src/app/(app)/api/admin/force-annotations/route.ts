import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { inngest } from "@/server/inngest/client";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  // Ensure only admins can trigger this
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    // Count how many articles are missing annotations
    const unannotatedCount = await db.articles.count({
      where: {
        article_annotations: null,
        blocked_reason: null,
      },
    });

    if (unannotatedCount === 0) {
      return NextResponse.json({
        status: "Complete",
        message: "Your database is perfectly synced. Zero articles need annotation.",
      });
    }

    // Trigger the Inngest batch processing job
    await inngest.send({
      name: "admin.resync.annotations",
      data: {},
    });

    return NextResponse.json({
      status: "Triggered",
      message: `Found ${unannotatedCount} articles missing AI classifications. Background job started processing them.`,
      backlog_remaining: unannotatedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to enqueue annotation resync" },
      { status: 500 },
    );
  }
}
