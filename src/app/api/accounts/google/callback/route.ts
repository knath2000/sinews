import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { encrypt } from "@/server/crypto";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";

/**
 * GET /api/accounts/google/callback — completes Google OAuth 2.0 flow.
 * Exchanges the authorization code for tokens, encrypts them, stores them.
 */
export async function GET(request: Request) {
  // Rate limit: 10 req/min per IP (OAuth callback — no auth yet)
  const rl = await applyRateLimit(request, "google-callback", {
    limit: 10,
    windowMs: 60_000,
    identifyBy: "ip",
  });
  if (rl) return rl;

  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?error=google_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?error=missing_params`
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
      { status: 500 }
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
        { status: 500 }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Encrypt tokens
    const accessTokenEncrypted = await encrypt(access_token);
    const refreshTokenEncrypted = refresh_token
      ? await encrypt(refresh_token)
      : null;

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

    return NextResponse.redirect(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/settings?connected=google`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
