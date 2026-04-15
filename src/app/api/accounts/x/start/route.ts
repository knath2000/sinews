import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/server/feature-flags";
import { requireAuth } from "@/lib/auth-server";

/**
 * POST /api/accounts/x/start — starts the X (Twitter) OAuth 2.0 PKCE flow.
 * Returns the authorization URL to redirect the user to.
 * Feature-flag gated: checks enable_x_sync before initiating.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  // Check feature flag before allowing the flow
  const enabled = await isFeatureEnabled("enable_x_sync", auth.dbUser.id);
  if (!enabled) {
    return NextResponse.json(
      { error: "X sync is not enabled" },
      { status: 403 },
    );
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri =
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/accounts/x/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "X_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const state = generateState();

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "tweet.read users.read follows.read likes.read bookmarks.read",
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.json({
    authUrl: authUrl.toString(),
  });

  // Store PKCE verifier in HTTP-only cookie (expires in 10 min)
  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
