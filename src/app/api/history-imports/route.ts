import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { isFeatureEnabled } from "@/server/feature-flags";
import { db } from "@/server/db/client";
import { getSignedUploadUrl } from "@/server/history-import/storage";
import { HISTORY_IMPORT_MAX_UPLOAD_BYTES } from "@/lib/constants";

// GET: Return latest import for user
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  const latest = await db.history_imports.findFirst({
    where: { user_id: auth.dbUser.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      source_type: true,
      browser: true,
      raw_file_name: true,
      schema_version: true,
      visit_count: true,
      accepted_count: true,
      rejected_count: true,
      preview_json: true,
      created_at: true,
      confirmed_at: true,
    },
  });

  return NextResponse.json({ import: latest });
}

// POST /create: Create new import record + signed upload URL
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  const enabled = await isFeatureEnabled("enable_safari_history_import");
  if (!enabled) {
    return NextResponse.json({ error: "Safari history import is not enabled" }, { status: 403 });
  }

  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1_000);

  const created = await db.history_imports.create({
    data: {
      user_id: auth.dbUser.id,
      status: "pending_upload",
      source_type: "safari_zip",
      browser: "safari",
      expires_at,
    },
  });

  const { signedUrl, token, path } = await getSignedUploadUrl(auth.dbUser.id, created.id);

  return NextResponse.json({
    importId: created.id,
    signedUrl,
    token,
    path,
    maxBytes: HISTORY_IMPORT_MAX_UPLOAD_BYTES,
  });
}
