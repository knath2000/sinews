import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/sign-in
 * Authenticate with email/password and establish a server session.
 * Supabase SSR cookies are written via createClient() so subsequent
 * API requests (settings, feed) resolve the user.
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

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "No session created" },
        { status: 500 }
      );
    }

    // Ensure DB user exists
    try {
      const { ensureUser } = await import("@/lib/auth");
      await ensureUser(data.session.user.id, email);
    } catch {
      // best-effort
    }

    return NextResponse.json({
      success: true,
      message: "Signed in successfully.",
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
