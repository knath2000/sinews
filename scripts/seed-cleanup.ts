import { PrismaClient } from "@prisma/client";
import { logError } from "../src/server/error-logger";

const db = new PrismaClient();

async function cleanup() {
  console.log("Running cleanup...");
  
  // Delete brief items first (FK dependency)
  await db.daily_brief_items.deleteMany({});
  console.log("  Cleaned up brief items");
  
  // Delete briefs
  await db.daily_briefs.deleteMany({});
  console.log("  Cleaned up briefs");
  
  // Delete annotations first (FK dependency on articles)
  await db.article_annotations.deleteMany({});
  console.log("  Cleaned up annotations");
  
  // Delete articles
  await db.articles.deleteMany({ where: { is_fixture: true } });
  console.log("  Cleaned up seed articles");
  
  // Clean up test users and related data
  const testUsers = await db.users.findMany({
    where: { email: { contains: "test-user-" } },
  });
  
  for (const user of testUsers) {
    await db.user_topic_preferences.deleteMany({
      where: { user_id: user.id },
    });
    await db.user_profiles.deleteMany({
      where: { user_id: user.id },
    });
  }
  await db.users.deleteMany({ where: { email: { contains: "test-user-" } } });
  console.log("  Cleaned up test users");
  
  // Clean up topic prefs with seed source
  await db.user_topic_preferences.deleteMany({ where: { source: "seed" } });
  console.log("  Cleaned up user topic preferences");
  
  console.log("Cleanup complete");
  await db.$disconnect();
}

cleanup().catch((error) => {
  logError("seed-cleanup", error);
  process.exit(1);
});
