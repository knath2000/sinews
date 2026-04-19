import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/settings/topics — returns user's current topic preferences
 * POST /api/settings/topics — add or remove a topic ({ action, topic })
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const preferences = await db.user_topic_preferences.findMany({
    where: { user_id: dbUser.id },
    select: { topic: true, weight: true, source: true },
  });

  return NextResponse.json({ preferences });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const body = await request.json().catch(() => null);
  if (!body || !body.action || !body.topic) {
    return NextResponse.json(
      { error: "Requires { action: 'add' | 'remove', topic: string }" },
      { status: 400 }
    );
  }

  const { action, topic } = body;

  if (action === "add") {
    // Upsert: insert or update the weight. Source is manual_topic.
    await db.user_topic_preferences.upsert({
      where: {
        user_id_topic_source: {
          user_id: dbUser.id,
          topic,
          source: "manual_topic",
        },
      },
      create: {
        user_id: dbUser.id,
        topic,
        source: "manual_topic",
        weight: 1.0,
      },
      update: {
        weight: 1.0,
      },
    });

    return NextResponse.json({ ok: true, action: "added", topic });
  }

  if (action === "remove") {
    await db.user_topic_preferences.deleteMany({
      where: {
        user_id: dbUser.id,
        topic,
        source: "manual_topic",
      },
    });

    return NextResponse.json({ ok: true, action: "removed", topic });
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'add' or 'remove'." },
    { status: 400 }
  );
}
