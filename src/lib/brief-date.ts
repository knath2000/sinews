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
 * Subtracts 24h from the user's local *start of day* (which is already UTC
 * midnight of that date), then re-reads the resulting UTC instant in the user's
 * timezone.  Because we subtract exactly one day from a midnight anchor, this
 * yields the correct calendar day in all DST / host-timezone combinations.
 */
export function getYesterdayBriefDate(timeZone: string): Date {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone });
  const todayUTC = new Date(todayStr); // YYYY-MM-DDT00:00:00Z — no host-TZ ambiguity
  const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayUTC.toLocaleDateString("en-CA", { timeZone });
  return new Date(yesterdayStr);
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
