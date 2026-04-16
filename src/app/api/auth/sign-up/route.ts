import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/sign-up
 * Create a new account with email/password and sign the user in immediately.
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

    const supabase = await createClient();

    // Sign up the user
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

    // We have a session — cookie is already set by supabase/ssr
    // Create user record in our DB if needed
    if (signUpData.user) {
      try {
        const { ensureUser } = await import("@/lib/auth");
        await ensureUser(signUpData.user.id, email);
      } catch {
        // Profile creation is best-effort; sign up succeeded regardless
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account created and signed in.",
    });
  } catch (err) {
    console.error("Sign-up error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
