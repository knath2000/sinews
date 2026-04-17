import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";

/**
 * GET /api/admin/users
 * List all users. Admin-only.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  try {
    const users = await db.users.findMany({
      include: {
        user_profiles: {
          select: {
            onboarding_complete: true,
            is_admin: true,
            brief_ready_hour_local: true,
            last_active_at: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        timezone: u.timezone,
        createdAt: u.created_at,
        profile: u.user_profiles
          ? {
              onboardingComplete: u.user_profiles.onboarding_complete,
              isAdmin: u.user_profiles.is_admin,
              briefReadyHour: u.user_profiles.brief_ready_hour_local,
              lastActiveAt: u.user_profiles.last_active_at,
            }
          : null,
      })),
    });
  } catch (error) {
    logError("admin-list-users", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
