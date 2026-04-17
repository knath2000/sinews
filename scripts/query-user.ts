import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  const user = await db.users.findFirst({ where: { email: "knath2000@icloud.com" } })
  if (!user) {
    console.log("User not found: knath2000@icloud.com")
    return
  }
  console.log("User:", user.id, "-", user.email)

  const prefs = await db.user_topic_preferences.findMany({
    where: { user_id: user.id },
    orderBy: [{ source: "asc" }, { weight: "desc" }]
  })
  console.log("\nTopic preferences (" + prefs.length + "):")
  for (const p of prefs) {
    console.log("  [" + p.source + "] " + p.topic + "  weight=" + p.weight)
  }

  const signals = await db.interest_signals.findMany({ where: { user_id: user.id } })
  console.log("\nInterest signal count:", signals.length)

  const byTopic: Record<string, { count: number; totalWeight: number }> = {}
  for (const s of signals) {
    const t = s.normalized_topic || "(none)"
    byTopic[t] = byTopic[t] || { count: 0, totalWeight: 0 }
    byTopic[t].count++
    byTopic[t].totalWeight += s.weight
  }
  const sorted = Object.entries(byTopic).sort((a, b) => b[1].totalWeight - a[1].totalWeight)
  console.log("Top topics by signal weight:")
  for (const [topic, info] of sorted.slice(0, 10)) {
    console.log("  " + topic + ": " + info.count + " signals, weight=" + info.totalWeight.toFixed(1))
  }

  const accounts = await db.linked_accounts.findMany({ where: { user_id: user.id } })
  console.log("\nLinked accounts:")
  for (const a of accounts) {
    console.log("  " + a.provider + ": status=" + a.status + ", last_sync=" + a.last_sync_at)
  }

  const profile = await db.user_profiles.findUnique({ where: { user_id: user.id } })
  if (profile) {
    console.log("\nProfile: onboarding=" + profile.onboarding_complete +
      ", brief_hour=" + profile.brief_ready_hour_local + ", consent=" + profile.consent_version_accepted)
  }

  await db.$disconnect()
}
main()
