import { db } from "@/server/db/client";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  profile: {
    displayName: string | null;
    onboarding_complete: boolean;
    briefReadyHourLocal: number;
    consentVersionAccepted: string | null;
    lastActiveAt: Date;
    isAdmin: boolean;
    darkMode: boolean;
  } | null;
}

/**
 * Fetch user and profile from our DB given a Supabase user ID,
 * creating them if they don't exist yet.
 */
export async function ensureUser(supabaseUserId: string, email: string): Promise<AuthUser> {
  let user = await db.users.findUnique({
    where: { id: supabaseUserId },
    include: { user_profiles: true },
  });

  if (!user) {
    // Create user and profile atomically
    const created = await db.users.create({
      data: {
        id: supabaseUserId,
        email,
        user_profiles: {
          create: {
            onboarding_complete: false,
          },
        },
      },
      include: { user_profiles: true },
    });
    user = created;
  }

  return {
    id: user.id,
    email: user.email,
    isAdmin: user.user_profiles?.is_admin ?? false,
    profile: user.user_profiles
      ? {
          displayName: user.user_profiles.display_name,
          onboarding_complete: user.user_profiles.onboarding_complete,
          briefReadyHourLocal: user.user_profiles.brief_ready_hour_local,
          consentVersionAccepted: user.user_profiles.consent_version_accepted,
          lastActiveAt: user.user_profiles.last_active_at,
          isAdmin: user.user_profiles.is_admin,
          darkMode: user.user_profiles.dark_mode,
        }
      : null,
  };
}
