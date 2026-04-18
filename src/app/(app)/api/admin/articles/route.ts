import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);

  try {
    const articles = await db.articles.findMany({
      where: { is_fixture: false },
      select: {
        id: true,
        title: true,
        source_name: true,
        provider: true,
        published_at: true,
        canonical_url: true,
        language: true,
      },
      orderBy: { published_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing article ID" }, { status: 400 });

  const articleId = parseInt(id, 10);
  if (isNaN(articleId)) return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });

  try {
    await db.$transaction(async (tx) => {
      // Clear annotation first (has FK with Cascade on article_annotations)
      await tx.article_annotations.deleteMany({
        where: { article_id: articleId },
      });

      // Nullify brief item references (article_id is nullable)
      await tx.daily_brief_items.updateMany({
        where: { article_id: articleId },
        data: { article_id: null },
      });

      // Now delete the article
      await tx.articles.delete({
        where: { id: articleId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
