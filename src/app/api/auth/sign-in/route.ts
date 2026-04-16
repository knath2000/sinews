import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * POST /api/auth/sign-in
 * Authenticate with email/password and establish a server-side session.
 *
 * Uses an explicit NextResponse so Supabase SSR cookie handlers can write
 * the session cookies to the outgoing HTTP response. This is critical for
 * persistence — without the response object, the cookies never reach the
 * browser and the next page reload sees no session (401).
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

    // Return JSON with the session cookies from the response object
    const jsonRes = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
    });
    // Copy set-cookie headers from response to jsonRes
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        jsonRes.headers.append(key, value);
      }
    });
    return jsonRes;
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
