import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { encrypt } from "@/server/crypto";
import { requireAuth } from "@/lib/auth-server";
import { inngest } from "@/server/inngest/client";

/**
 * GET /api/accounts/x/callback — completes the X OAuth 2.0 PKCE flow.
 * Exchanges the authorization code for tokens, encrypts them, and stores them.
 * Emits an account.linked event to trigger the X sync job.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?error=${error}`,
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
    .find((c) => c.trim().startsWith("x_oauth_state="))
    ?.split("=")[1];

  if (state !== savedState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  // Get code verifier from cookie
  const codeVerifier = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("x_code_verifier="))
    ?.split("=")[1];

  if (!codeVerifier) {
    return NextResponse.json(
      { error: "Code verifier not found (expired?)" },
      { status: 400 },
    );
  }

  // Exchange code for tokens
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri =
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/accounts/x/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "X OAuth credentials not configured" },
      { status: 500 },
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("X token exchange failed:", errText);
      return NextResponse.json(
        { error: "Failed to exchange code for tokens" },
        { status: 500 },
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Encrypt tokens before storing
    const accessTokenEncrypted = await encrypt(access_token);
    const refreshTokenEncrypted = refresh_token
      ? await encrypt(refresh_token)
      : null;

    // Upsert in linked_accounts (in case re-connecting)
    const existing = await db.linked_accounts.findFirst({
      where: { user_id: dbUser.id, provider: "x" },
      select: { id: true },
    });

    if (existing) {
      await db.linked_accounts.update({
        where: { id: existing.id },
        data: {
          status: "active",
          scopes_json: Array.isArray(scope) ? JSON.stringify(scope) : scope,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: new Date(Date.now() + (expires_in ?? 7200) * 1000),
          sync_error_code: null,
          sync_failure_count: 0,
          last_sync_at: new Date(),
        },
      });
    } else {
      await db.linked_accounts.create({
        data: {
          user_id: dbUser.id,
          provider: "x",
          status: "active",
          scopes_json: Array.isArray(scope) ? JSON.stringify(scope) : scope,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          expires_at: new Date(Date.now() + (expires_in ?? 7200) * 1000),
          last_sync_at: new Date(),
        },
      });
    }

    // Emit account.linked event to trigger sync job
    try {
      await inngest.send({
        name: "account.linked",
        data: { userId: dbUser.id, provider: "x" },
      });
    } catch (err) {
      // Non-fatal: sync will also run on cron
      console.warn("Failed to emit account.linked event:", err);
    }

    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?connected=x`,
    );
  } catch (err) {
    console.error("X OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 },
    );
  }
}
