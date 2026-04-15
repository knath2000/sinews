import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verification Report\n" + "=".repeat(50));

  // 1. Article count (should be >= 220)
  const articleCount = await prisma.articles.count();
  console.log(`Articles:           ${articleCount}  ${articleCount >= 220 ? "PASS" : "FAIL"} (need >= 220)`);

  // 2. Unique canonical URLs (no actual duplicates)
  const articleRows: any[] = await prisma.$queryRaw`
    SELECT canonical_url, COUNT(*) as cnt FROM articles GROUP BY canonical_url HAVING COUNT(*) > 1
  `;
  const urlDupes = articleRows.length;
  console.log(`URL duplicates:     ${urlDupes}  ${urlDupes === 0 ? "PASS" : "FAIL"} (expect 0)`);

  // 3. Annotation count (should match article count)
  const annotationCount = await prisma.article_annotations.count();
  console.log(`Annotations:        ${annotationCount}  ${annotationCount === articleCount ? "PASS" : "FAIL"} (expect ${articleCount})`);

  // 4. Brief items for today's brief
  const userResult = await prisma.$queryRaw`SELECT id FROM users LIMIT 1`;
  const userId: string = (userResult as any[])[0]?.id;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayBrief: any[] = await prisma.$queryRaw`
    SELECT id FROM daily_briefs WHERE user_id = ${userId}::uuid AND brief_date = ${todayStr}::date LIMIT 1
  `;
  if (todayBrief.length > 0) {
    const todayItemsResult: any[] = await prisma.$queryRaw`SELECT COUNT(*) as count FROM daily_brief_items WHERE daily_brief_id = ${todayBrief[0].id}`;
    const cnt = todayItemsResult[0].count;
    console.log(`Today's brief items: ${cnt}  ${Number(cnt) === 5 ? "PASS" : "FAIL"} (expect 5)`);
  } else {
    console.log("Today's brief items: 0  FAIL (no brief found for today)");
    console.log(`  Debug: user_id=${userId}, todayStr=${todayStr}`);
  }

  // 5. Yesterday's brief items
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yBrief: any[] = await prisma.$queryRaw`
    SELECT id FROM daily_briefs WHERE user_id = ${userId}::uuid AND brief_date = ${yesterdayStr}::date LIMIT 1
  `;
  if (yBrief.length > 0) {
    const yItemsResult: any[] = await prisma.$queryRaw`SELECT COUNT(*) as count FROM daily_brief_items WHERE daily_brief_id = ${yBrief[0].id}`;
    const cy = yItemsResult[0].count;
    console.log(`Yesterday items:    ${cy}  ${Number(cy) === 5 ? "PASS" : "FAIL"} (expect 5)`);
  } else {
    // Debug: show all brief dates
    const allBriefs = await prisma.$queryRaw`SELECT id, brief_date FROM daily_briefs`;
    console.log("Yesterday items:    0  FAIL (no brief found for yesterday)");
    console.log(`  Debug - all brief dates: ${(allBriefs as any[]).map((b: any) => b.brief_date)}`);
    console.log(`  Expected: ${yesterdayStr}`);
  }

  // 6. Interest signals count (should be >= 15)
  const signalCount = await prisma.interest_signals.count();
  console.log(`Interest signals:   ${signalCount}  ${signalCount >= 15 ? "PASS" : "FAIL"} (need >= 15)`);

  // 7. Linked accounts count
  const linkedCount = await prisma.linked_accounts.count();
  console.log(`Linked accounts:    ${linkedCount}  ${linkedCount >= 1 ? "PASS" : "FAIL"} (need >= 1)`);

  // Extra checks
  const userCount = await prisma.users.count();
  console.log(`Users:              ${userCount}  ${userCount === 1 ? "PASS" : "FAIL"} (expect 1)`);

  const profileCount = await prisma.user_profiles.count();
  console.log(`Profiles:           ${profileCount}  ${profileCount === 1 ? "PASS" : "FAIL"} (expect 1)`);

  const topicCount = await prisma.user_topic_preferences.count();
  console.log(`Topic prefs:        ${topicCount}  ${topicCount === 10 ? "PASS" : "FAIL"} (expect 10)`);

  const briefCount = await prisma.daily_briefs.count();
  console.log(`Daily briefs:       ${briefCount}  ${briefCount === 2 ? "PASS" : "FAIL"} (expect 2)`);

  const totalBriefItems = await prisma.daily_brief_items.count();
  console.log(`Total brief items:  ${totalBriefItems}  ${totalBriefItems === 10 ? "PASS" : "FAIL"} (expect 10)`);

  // Source distribution
  const sources: any[] = await prisma.$queryRaw`
    SELECT source_name, COUNT(*) as cnt FROM articles GROUP BY source_name ORDER BY cnt DESC
  `;
  console.log(`\nSource distribution:`);
  for (const s of sources) {
    console.log(`  ${s.source_name}: ${s.cnt} articles`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Verification complete.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
