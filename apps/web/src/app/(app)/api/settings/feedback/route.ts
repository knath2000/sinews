import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  try {
    const feedback = await db.feedback_events.findMany({
      where: { user_id: auth.dbUser.id },
      orderBy: { created_at: "desc" },
      include: {
        article: {
          select: {
            title: true,
            published_at: true,
            canonical_url: true,
            source_name: true,
          },
        },
        archived_article: {
          select: {
            title: true,
            published_at: true,
            canonical_url: true,
            source_name: true,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      feedback: feedback.map(({ archived_article, ...item }) => ({
        ...item,
        article: item.article ?? archived_article,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch feedback history:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
