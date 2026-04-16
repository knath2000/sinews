import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * POST /api/history-imports/[id]/confirm
 * Commits staged Safari import signals as interest_signals.
 * Only allowed when status = preview_ready.
 * Replaces any prior history_import signals for the user.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  const { id } = await params;
  const { dbUser } = auth;

  const importRecord = await db.history_imports.findUnique({
    where: { id, user_id: dbUser.id },
  });

  if (!importRecord) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  if (importRecord.status !== "preview_ready") {
    return NextResponse.json(
      { error: `Import must be in preview_ready status (current: ${importRecord.status})` },
      { status: 400 }
    );
  }

  const stagedSignalsJson = importRecord.staged_signals_json;
  if (!stagedSignalsJson) {
    return NextResponse.json(
      { error: "No staged signals found" },
      { status: 500 }
    );
  }

  let stagedSignals: Array<{
    normalized_topic: string;
    weight: number;
    confidence: number;
    raw_value: string;
    observed_at: string;
    expires_at: string;
    source_reference: string;
  }>;

  try {
    stagedSignals = JSON.parse(stagedSignalsJson) as typeof stagedSignals;
  } catch {
    return NextResponse.json(
      { error: "Invalid staged signals data" },
      { status: 500 }
    );
  }

  await db.$transaction(async (tx) => {
    // Delete all prior history_import signals for this user
    await tx.interest_signals.deleteMany({
      where: { user_id: dbUser.id, provider: "history_import" },
    });

    // Insert new signals
    if (stagedSignals.length > 0) {
      await tx.interest_signals.createMany({
        data: stagedSignals.map((s) => ({
          user_id: dbUser.id,
          provider: "history_import",
          signal_type: "safari_history_import",
          normalized_topic: s.normalized_topic,
          weight: s.weight,
          confidence: s.confidence,
          raw_value: s.raw_value,
          observed_at: new Date(s.observed_at),
          expires_at: new Date(s.expires_at),
          source_reference: s.source_reference,
          signal_strength_bucket: Math.round(
            Math.min(5, Math.max(0, s.weight * 5))
          ),
        })),
      });
    }

    // Mark import confirmed
    await tx.history_imports.update({
      where: { id },
      data: { status: "confirmed", confirmed_at: new Date() },
    });
  });

  return NextResponse.json({
    ok: true,
    signalsCount: stagedSignals.length,
  });
}
