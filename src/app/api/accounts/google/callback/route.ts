import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { encrypt } from "@/server/crypto";

/**
 * GET /api/accounts/google/callback — completes Google OAuth 2.0 flow.
 * Exchanges the authorization code for tokens, encrypts them, stores them.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  // Check feature flag
  const { dbUser } = auth;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?error=google_${error}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?error=missing_params`,
    );
  }

  // Verify state
  const savedState = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("google_oauth_state="))
    ?.split("=")[1];

  if (state !== savedState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/accounts/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth credentials not configured" },
      { status: 500 },
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Google token exchange failed:", errText);
      return NextResponse.json(
        { error: "Failed to exchange code for tokens" },
        { status: 500 },
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Encrypt tokens
    const accessTokenEncrypted = await encrypt(access_token);
    const refreshTokenEncrypted = refresh_token
      ? await encrypt(refresh_token)
      : null;

    // Upsert (in case re-connecting)
    const existing = await db.linked_accounts.findFirst({
      where: { user_id: dbUser.id, provider: "google" },
      select: { id: true },
    });

    if (existing) {
      await db.linked_accounts.update({
        where: { id: existing.id },
        data: {
          status: "active",
          scopes_json: typeof scope === "string" ? scope : JSON.stringify(scope),
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: new Date(Date.now() + (expires_in ?? 3600) * 1000),
          sync_error_code: null,
          sync_failure_count: 0,
          last_sync_at: new Date(),
        },
      });
    } else {
      await db.linked_accounts.create({
        data: {
          user_id: dbUser.id,
          provider: "google",
          status: "active",
          scopes_json: typeof scope === "string" ? scope : JSON.stringify(scope),
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: new Date(Date.now() + (expires_in ?? 3600) * 1000),
          last_sync_at: new Date(),
        },
      });
    }

    // Emit account.linked event to trigger sync
    try {
      const inngest = await import("@/server/inngest/client").then((m) => m.inngest);
      await inngest.send({
        name: "account.linked",
        data: { userId: dbUser.id, provider: "google" },
      });
    } catch (err) {
      // Non-fatal: sync will also run on cron
      console.warn("Failed to emit account.linked event:", err);
    }

    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?connected=google`,
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 },
    );
  }
}
