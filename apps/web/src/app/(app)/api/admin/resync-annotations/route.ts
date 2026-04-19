import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { inngest } from "@/server/inngest/client";
import { logError } from "@/server/error-logger";
import { db } from "@/server/db/client";

export async function POST() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    const unannotatedCount = await db.articles.count({
      where: {
        article_annotations: null,
        blocked_reason: null,
      },
    });

    if (unannotatedCount === 0) {
      return NextResponse.json({
        status: "complete",
        message: "All articles are already annotated.",
      });
    }

    await inngest.send({
      name: "admin.resync.annotations",
      data: {},
    });

    return NextResponse.json({
      status: "queued",
      message: `Found ${unannotatedCount} unannotated articles. Batch processing queued.`,
      unannotatedCount,
    });
  } catch (error) {
    logError("admin-resync-annotations", error);
    return NextResponse.json(
      { error: "Failed to enqueue annotation resync" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    const unannotatedCount = await db.articles.count({
      where: {
        article_annotations: null,
        blocked_reason: null,
      },
    });

    return NextResponse.json({ unannotatedCount });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch count" },
      { status: 500 },
    );
  }
}
