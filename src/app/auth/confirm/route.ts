import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /auth/confirm
 *
 * Handles Supabase magic-link / signup email confirmations.
 * The magic link redirects here with token_hash, type, and next
 * query params. We call verifyOtp to create the session cookie,
 * then redirect the user to their original destination.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "magiclink" | null;
  const nextPath = searchParams.get("next") ?? "/onboarding";

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "auth-confirm-failed");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify session was created
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "no-session-after-confirm");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
