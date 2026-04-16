import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * POST /api/auth/sign-up
 * Create a new account with email/password and sign the user in immediately.
 *
 * Uses an explicit NextResponse so Supabase SSR cookie handlers can write
 * the session cookies to the outgoing HTTP response.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create a response object first so we can pass cookies through it
    const response = NextResponse.next();
    const req = request as NextRequest;

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signUpError) {
      if (signUpError.message?.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    // If email confirmation is required, notify the user
    if (signUpData?.session === null) {
      return NextResponse.json({
        success: true,
        message: "Account created. Please check your email to confirm.",
      });
    }

    // We have a session — write cookies to response
    // Create user record in our DB if needed
    if (signUpData.user) {
      try {
        const { ensureUser } = await import("@/lib/auth");
        await ensureUser(signUpData.user.id, email);
      } catch {
        // Profile creation is best-effort; sign up succeeded regardless
      }
    }

    // Return JSON with the session cookies from the response object
    const jsonRes = NextResponse.json({
      success: true,
      message: "Account created and signed in.",
    });
    // Copy set-cookie headers from response to jsonRes
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        jsonRes.headers.append(key, value);
      }
    });
    return jsonRes;
  } catch (err) {
    console.error("Sign-up error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
