import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.feedback_events.deleteMany({});
  await prisma.daily_brief_items.deleteMany({});
  await prisma.daily_briefs.deleteMany({});
  await prisma.article_annotations.deleteMany({});
  await prisma.archived_articles.deleteMany({});
  await prisma.articles.deleteMany({});
  await prisma.interest_signals.deleteMany({});
  await prisma.linked_accounts.deleteMany({});
  await prisma.user_topic_preferences.deleteMany({});
  await prisma.user_profiles.deleteMany({});
  await prisma.users.deleteMany({});
  console.log("All tables cleared.");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
