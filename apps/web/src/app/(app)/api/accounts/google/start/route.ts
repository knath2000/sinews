import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/server/feature-flags";
import { requireAuth } from "@/lib/auth-server";
import { getAppBaseUrl } from "@/lib/app-url";

/**
 * POST /api/accounts/google/start — starts Google OAuth 2.0 flow.
 * Returns the authorization URL to redirect the user to.
 * Feature-flag gated: checks enable_google_sync before initiating.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;

  // Check feature flag before allowing the flow
  const enabled = await isFeatureEnabled(
    "enable_google_sync",
    auth.dbUser.id,
  );
  if (!enabled) {
    return NextResponse.json(
      { error: "Google sync is not enabled" },
      { status: 403 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${getAppBaseUrl(request)}/api/accounts/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  const state = generateState();
  const nonce = generateState();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.organization.read https://www.googleapis.com/auth/user.phonenumbers.read https://www.googleapis.com/auth/user.addresses.read https://www.googleapis.com/auth/user.languages.read",
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.json({
    authUrl: authUrl.toString(),
  });

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("google_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
