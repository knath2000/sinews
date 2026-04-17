"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/lib/supabase-provider";

type Mode = "signin" | "signup";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, configured } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // Redirect if already logged in
  if (session && !emailConfirmationRequired) {
    const redirect = searchParams.get("redirect") || "/feed";
    router.push(redirect);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const endpoint = mode === "signup"
      ? "/api/auth/sign-up"
      : "/api/auth/sign-in";

    startTransition(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Authentication failed");
        } else {
          setMessage(data.message || "Success!");
          // If sign-up requires email confirmation, stay on the login page
          if (data.message?.includes("check your email")) {
            setEmailConfirmationRequired(true);
            return;
          }
          // Otherwise, redirect after session is established
          await new Promise((r) => setTimeout(r, 500));
          const redirect = searchParams.get("redirect") || "/feed";
          router.push(redirect);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-zinc-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {mode === "signin"
              ? "Enter your email and password"
              : "Enter your email and choose a password"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {!configured && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Authentication is not configured for this deployment yet. Set the
              Supabase production env vars in Vercel and redeploy.
            </div>
          )}

          {message && (
            <div className={`rounded-lg p-4 text-sm border ${
              emailConfirmationRequired
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              {message}
              {emailConfirmationRequired && (
                <p className="mt-2 text-sm">
                  Once confirmed,{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/feed")}
                    className="underline font-medium"
                  >
                    go to your feed
                  </button>
                  .
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {!emailConfirmationRequired && (
            <>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  disabled={isPending || !!message || !configured}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="At least 6 characters"
                  disabled={isPending || !!message || !configured}
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !!message || !configured}
                className="w-full flex justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? (mode === "signin" ? "Signing in..." : "Creating account...")
                  : !configured
                    ? "Auth unavailable"
                    : (message
                      ? (mode === "signin" ? "Signed in" : "Account created")
                      : (mode === "signin" ? "Sign in" : "Sign up"))}
              </button>
            </>
          )}
        </form>

        {/* Toggle between sign-in and sign-up */}
        {!emailConfirmationRequired && (
          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); setError(""); }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}

        {!emailConfirmationRequired && (
          <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
            By creating an account, you agree to our{" "}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
