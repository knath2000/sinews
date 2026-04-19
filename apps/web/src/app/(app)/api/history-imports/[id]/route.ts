import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";

/**
 * DELETE /api/history-imports/[id]
 * Removes Safari-import-derived signals and marks the import deleted.
 */
export async function DELETE(
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

  try {
    await db.history_imports.update({
      where: { id },
      data: { status: "deleted" },
    });

    // Only delete signals if the import was confirmed (signals were committed)
    if (importRecord.status === "confirmed") {
      await db.interest_signals.deleteMany({
        where: {
          user_id: dbUser.id,
          provider: "history_import",
          signal_type: "safari_history_import",
          source_reference: {
            contains: `history_import:${id}:`,
          },
        },
      });
    }
  } catch (error) {
    logError("history-import-delete", error, { importId: id, userId: dbUser.id });
    return NextResponse.json(
      { error: "Failed to delete Safari import" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Safari import deleted and signals removed" });
}
