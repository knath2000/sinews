/**
 * Shared timezone-aware brief date helpers.
 *
 * `brief_date` is stored as a Date representing YYYY-MM-DDT00:00:00.000Z
 * computed from the user's local calendar day.  All brief lookups must
 * use the same timezone-aware computation to avoid missing existing
 * briefs after UTC midnight but before the user's local midnight.
 */

import { db } from "@/server/db/client";

const DEFAULT_TZ = "America/Los_Angeles";

/**
 * Compute today's brief date in the given timezone.
 * Returns a Date object representing the start of the user's local day as UTC.
 */
export function getTodayBriefDate(timeZone: string): Date {
  const localDateStr = new Date().toLocaleDateString("en-CA", { timeZone });
  return new Date(localDateStr);
}

/**
 * Compute yesterday's brief date for novelty scoring.
 *
 * Uses Intl.DateTimeFormat parts to get the user's current calendar Y/M/D,
 * then subtracts one day using integer arithmetic and formats the result as
 * an ISO date string.  No Date constructor round-trips, no host-timezone
 * dependency — works correctly on any host and across DST transitions.
 */
export function getYesterdayBriefDate(timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => {
    const p = parts.find((p) => p.type === type);
    return p ? parseInt(p.value, 10) : 1;
  };
  const y = get("year");
  const m = get("month") - 1;
  const d = get("day");

  // Pure calendar subtraction: one day before (y, m, d)
  const d1 = d - 1;
  if (d1 > 0) return new Date(`${y}-${String(m + 1).padStart(2, "0")}-${String(d1).padStart(2, "0")}`);

  // Go to previous month
  const m1 = m - 1;
  if (m1 >= 0) {
    const dim = new Date(Date.UTC(y, m1 + 1, 0)).getUTCDate();
    return new Date(`${y}-${String(m1 + 1).padStart(2, "0")}-${String(dim).padStart(2, "0")}`);
  }

  // Wrap to previous year, December 31
  return new Date(`${y - 1}-12-31`);
}

/**
 * Fetch the user's timezone and compute today's brief date.
 */
export async function getTodayBriefDateForUser(userId: string): Promise<Date> {
  const userRecord = await db.users.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return getTodayBriefDate(userRecord?.timezone ?? DEFAULT_TZ);
}

/**
 * Fetch the user's timezone and compute yesterday's brief date.
 */
export async function getYesterdayBriefDateForUser(userId: string): Promise<Date> {
  const userRecord = await db.users.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return getYesterdayBriefDate(userRecord?.timezone ?? DEFAULT_TZ);
}

/**
 * Fetch the user's timezone and return Prisma where clause for today's range.
 */
export async function getUserBriefDateRange(userId: string): Promise<{ gte: Date; lt: Date }> {
  const userRecord = await db.users.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return getUserBriefDateRangeFromTz(userRecord?.timezone ?? DEFAULT_TZ);
}

/**
 * Compute Prisma where clause for today's briefing range (user-local).
 */
export function getUserBriefDateRangeFromTz(timeZone: string): { gte: Date; lt: Date } {
  const today = getTodayBriefDate(timeZone);
  return { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
}
