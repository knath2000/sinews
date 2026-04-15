// seed.ts - Full E2E verification seed script for AI News app
// Run: npx tsx --tsconfig tsconfig.json scripts/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Taxonomy
const TOPICS = [
  "artificial_intelligence",
  "machine_learning",
  "startups",
  "big_tech",
  "software_engineering",
  "cybersecurity",
  "markets",
  "economy",
  "business",
  "media",
  "politics",
  "policy",
  "science",
  "health",
  "climate",
  "space",
  "sports",
  "entertainment",
  "consumer_products",
] as const;

const SOURCES = [
  "TechCrunch",
  "The Verge",
  "Ars Technica",
  "Wired",
  "MIT Technology Review",
  "CNET",
  "BBC Tech",
  "Engadget",
  "VentureBeat",
  "VentureBeat",
  "The Information",
  "Reuters Tech",
  "Bloomberg Tech",
  "Axio",
  "9to5Mac",
  "Android Police",
  "Tom's Hardware",
  "ZDNet",
  "TechRadar",
  "Gizmo",
] as const;
// Deduplicate sources
const UNIQUE_SOURCES = [...new Set(SOURCES)];

// Realistic AI/Tech headline templates with variations
const HEADLINES = [
  // AI/ML
  { title: "OpenAI launches new reasoning model that cuts inference costs by 70%", topics: ["artificial_intelligence", "machine_learning"] },
  { title: "Google DeepMind publishes breakthrough paper on multimodal AI alignment", topics: ["artificial_intelligence", "machine_learning", "science"] },
  { title: "Meta open-sources LLaMA-4 with 1 trillion parameters", topics: ["artificial_intelligence", "big_tech", "machine_learning"] },
  { title: "Anthropic Claude 3.5 sets new benchmark on MMLU and GPQA", topics: ["artificial_intelligence", "machine_learning"] },
  { title: "Microsoft Copilot now integrates with 50+ third-party apps via new API", topics: ["big_tech", "software_engineering", "artificial_intelligence"] },
  { title: "EU AI Act enforcement begins: what tech companies need to know", topics: ["policy", "politics", "artificial_intelligence"] },
  { title: "Nvidia's next-gen AI chip leaks: 2x performance, 40% less power", topics: ["big_tech", "artificial_intelligence", "consumer_products"] },
  { title: "Startup raises $2B to build AI data centers powered by nuclear", topics: ["startups", "climate", "artificial_intelligence"] },
  { title: "Apple Vision Pro 2 rumored to feature eye-tracking AI", topics: ["big_tech", "consumer_products", "artificial_intelligence"] },
  { title: "Autonomous vehicle startup Waymo expands to 12 new cities", topics: ["startups", "artificial_intelligence", "business"] },
  { title: "New study shows AI coding assistants reduce bugs by 45%", topics: ["artificial_intelligence", "software_engineering"] },
  { title: "China announces $140B fund to boost domestic AI chip production", topics: ["politics", "policy", "big_tech"] },
  { title: "Hugging Face hits 100,000 community-hosted models milestone", topics: ["artificial_intelligence", "software_engineering", "machine_learning"] },
  { title: "AI healthcare startup receives FDA approval for diagnostic tool", topics: ["health", "startups", "artificial_intelligence"] },
  { title: "Researchers warn of AI-generated disinformation in upcoming elections", topics: ["politics", "media", "artificial_intelligence"] },
  { title: "Open-source vs proprietary AI: the legal battle intensifies", topics: ["artificial_intelligence", "policy", "business"] },
  { title: "Amazon Web Services launches Bedrock Agents for enterprise automation", topics: ["big_tech", "artificial_intelligence", "business"] },
  { title: "AI-powered protein discovery leads to new cancer drug candidate", topics: ["science", "health", "artificial_intelligence", "machine_learning"] },
  { title: "Stability AI releases Stable Video Diffusion 3 with real-time generation", topics: ["artificial_intelligence", "machine_learning", "consumer_products"] },
  { title: "Tech layoffs continue as AI reshapes workforce plans at major firms", topics: ["big_tech", "business", "artificial_intelligence"] },

  // Cybersecurity
  { title: "Critical zero-day vulnerability found in popular password manager", topics: ["cybersecurity", "consumer_products"] },
  { title: "Ransomware attack on major hospital network disrupts patient care", topics: ["cybersecurity", "health"] },
  { title: "New supply chain attack targets JavaScript package ecosystem", topics: ["cybersecurity", "software_engineering"] },
  { title: "NSA warns of AI-powered phishing campaigns targeting government", topics: ["cybersecurity", "politics", "artificial_intelligence"] },
  { title: "CISA releases new framework for AI system security testing", topics: ["cybersecurity", "policy", "artificial_intelligence"] },
  { title: "Major cloud provider suffers 4-hour outage due to DDoS attack", topics: ["cybersecurity", "big_tech"] },
  { title: "Quantum-safe encryption standard finally ratified by NIST", topics: ["cybersecurity", "science", "policy"] },
  { title: "Data breach at social media giant exposes 500M user records", topics: ["cybersecurity", "media", "big_tech"] },
  { title: "IoT botnet resurfaces with millions of new compromised devices", topics: ["cybersecurity", "consumer_products"] },
  { title: "Cybersecurity startup raises $500M at unicorn valuation", topics: ["cybersecurity", "startups", "markets"] },

  // Startups/Business
  { title: "AI startup Perplexity reportedly exploring acquisition offer", topics: ["startups", "artificial_intelligence", "business"] },
  { title: "Notion introduces AI-powered workflow builder for teams", topics: ["startups", "software_engineering", "artificial_intelligence"] },
  { title: "SpaceX Starship completes sixth successful orbital test flight", topics: ["space", "startups", "science"] },
  { title: "Fintech unicorn Stripe prepares for 2025 IPO", topics: ["startups", "markets", "business"] },
  { title: "YC-backed robot startup demonstrates humanoid walking and grasping", topics: ["startups", "artificial_intelligence", "science"] },
  { title: "Climate tech funding drops 30% year-over-year in Q2", topics: ["climate", "startups", "markets"] },
  { title: "Former Google exec launches new AI search engine targeting developers", topics: ["startups", "artificial_intelligence", "software_engineering"] },
  { title: "Electric vehicle maker reports record deliveries despite supply issues", topics: ["business", "consumer_products", "climate"] },
  { title: "Venture capital firms shift focus from SaaS to AI infrastructure", topics: ["startups", "markets", "artificial_intelligence"] },
  { title: "Crypto exchange Binance settles for $4B with US regulators", topics: ["markets", "policy", "big_tech"] },

  // Software Engineering
  { title: "Rust 1.80 released with improved async performance", topics: ["software_engineering"] },
  { title: "GitHub Copilot Workspace graduates from preview to GA", topics: ["software_engineering", "big_tech", "artificial_intelligence"] },
  { title: "Docker announces new container orchestration feature for edge computing", topics: ["software_engineering", "big_tech"] },
  { title: "Kubernetes 1.31 brings major security improvements", topics: ["software_engineering", "cybersecurity"] },
  { title: "New React Server Components benchmark shows 3x faster rendering", topics: ["software_engineering", "big_tech"] },
  { title: "PostgreSQL 17 adds full-text AI embedding support", topics: ["software_engineering", "artificial_intelligence"] },
  { title: "Devin AI coding agent now handles real-world pull requests", topics: ["software_engineering", "artificial_intelligence", "startups"] },
  { title: "Mozilla launches new privacy-first browser engine fork", topics: ["software_engineering", "media"] },
  { title: "Supabase releases real-time database triggers for edge functions", topics: ["software_engineering", "startups"] },
  { title: "Deno 2.0 ships with built-in TypeScript and npm compatibility", topics: ["software_engineering", "big_tech"] },

  // Markets/Economy
  { title: "Fed signals potential rate cut amid AI-driven productivity gains", topics: ["economy", "markets"] },
  { title: "Nvidia becomes first $4 trillion company on AI boom", topics: ["markets", "big_tech", "artificial_intelligence"] },
  { title: "S&P 500 hits new all-time high on tech earnings beat", topics: ["markets", "business"] },
  { title: "Global semiconductor shortage expected to ease by 2026", topics: ["business", "consumer_products"] },
  { title: "AI stocks face volatility as investors question valuations", topics: ["markets", "artificial_intelligence"] },
  { title: "US inflation cools to 2.2%, opening door for rate cuts", topics: ["economy", "markets"] },
  { title: "Enterprise cloud spending grows 25% year-over-year", topics: ["business", "big_tech"] },
  { title: "India emerges as new AI manufacturing hub with $50B investment", topics: ["economy", "business", "artificial_intelligence"] },
  { title: "Global e-commerce sales surpass $7 trillion in 2025", topics: ["markets", "business"] },
  { title: "Housing market reacts to rising remote work flexibility", topics: ["economy", "business"] },

  // Science/Health/Climate
  { title: "CRISPR gene therapy cures inherited blindness in clinical trial", topics: ["science", "health"] },
  { title: "NASA's Webb telescope discovers Earth-sized exoplanet in habitable zone", topics: ["space", "science"] },
  { title: "New battery technology promises 1000-mile EV range", topics: ["climate", "science", "consumer_products"] },
  { title: "WHO declares AI-powered tuberculosis detection ready for global use", topics: ["health", "artificial_intelligence"] },
  { title: "Ocean cleanup project removes 1 million tons of plastic", topics: ["climate", "science"] },
  { title: "Fusion energy experiment achieves net-positive output for 10 seconds", topics: ["science", "climate"] },
  { title: "Brain-computer interface allows paralyzed patients to control devices", topics: ["science", "health", "artificial_intelligence"] },
  { title: "Arctic ice reaches record low prompting urgent policy calls", topics: ["climate", "politics"] },
  { title: "mRNA vaccine for malaria enters Phase 3 trials", topics: ["health", "science"] },
  { title: "Dark matter candidate detected in underground experiment", topics: ["space", "science"] },

  // Media/Entertainment
  { title: "Netflix introduces AI-generated interactive episodes", topics: ["media", "entertainment", "artificial_intelligence"] },
  { title: "Spotify's AI DJ feature now supports 50 languages", topics: ["media", "entertainment", "artificial_intelligence"] },
  { title: "Hollywood studios reach new agreement on AI use in productions", topics: ["media", "entertainment", "artificial_intelligence", "policy"] },
  { title: "TikTok launches AI music creation tools for creators", topics: ["media", "entertainment", "artificial_intelligence"] },
  { title: "Video game industry revenue hits $200B with AI-driven worlds", topics: ["entertainment", "artificial_intelligence"] },
  { title: "AI deepfake detection law passes Senate with bipartisan support", topics: ["politics", "policy", "media"] },
  { title: "Streaming war heats up as Max lowers subscription prices", topics: ["media", "business"] },
  { title: "Esports tournament offers $50M prize pool, largest in history", topics: ["sports", "entertainment"] },

  // Sports
  { title: "AI-powered analytics change how NFL teams draft players", topics: ["sports", "artificial_intelligence"] },
  { title: "Formula 1 introduces new regulations for 2026 season", topics: ["sports", "consumer_products"] },
  { title: "Olympic committee approves robot referee for gymnastics", topics: ["sports", "artificial_intelligence"] },

  // Consumer Products
  { title: "Samsung Galaxy S26 features AI camera that edits photos in real-time", topics: ["consumer_products", "artificial_intelligence"] },
  { title: "Smart home hub war: Amazon and Google go head to head", topics: ["consumer_products", "big_tech"] },
  { title: "Wireless earbuds market grows 15% with health monitoring features", topics: ["consumer_products", "health"] },
  { title: "Apple Watch detects atrial fibrillation in 98% accuracy study", topics: ["consumer_products", "health"] },
  { title: "Robot vacuum company Roomba adds AI navigation upgrades", topics: ["consumer_products", "artificial_intelligence"] },

  // Space
  { title: "Blue Origin completes successful crewed suborbital flight", topics: ["space", "startups"] },
  { title: "Mars rover discovers evidence of ancient microbial life", topics: ["space", "science"] },
  { title: "Commercial space station receives first crew module", topics: ["space", "startups", "science"] },

  // Politics/Policy
  { title: "White House announces $10B AI safety research initiative", topics: ["policy", "politics", "artificial_intelligence"] },
  { title: "UK proposes new digital services tax targeting Big Tech", topics: ["policy", "politics", "big_tech"] },
  { title: "G7 nations agree on AI governance framework", topics: ["policy", "politics", "artificial_intelligence"] },
  { title: "China tightens regulations on generative AI content", topics: ["policy", "politics", "artificial_intelligence"] },
  { title: "California passes law requiring AI watermark disclosure", topics: ["policy", "politics", "artificial_intelligence"] },
  { title: "Antitrust case against Google enters final arguments", topics: ["policy", "politics", "big_tech"] },
  { title: "Federal judge blocks controversial social media law in Texas", topics: ["politics", "policy", "media"] },
  { title: "EU fines Meta $1.3B over data transfer violations", topics: ["policy", "big_tech", "markets"] },

  // Mixed/Additional Variety
  { title: "AI tutoring platform claims to improve student scores by 35%", topics: ["artificial_intelligence", "education"] },
  { title: "Quantum computing startup demonstrates 1000-qubit processor", topics: ["science", "startups", "artificial_intelligence"] },
  { title: "Autonomous delivery robots expand to 200 campuses nationwide", topics: ["artificial_intelligence", "business", "consumer_products"] },
  { title: "New open data standard for AI training sets released", topics: ["artificial_intelligence", "policy"] },
  { title: "Tech workers union grows as AI job replacement fears mount", topics: ["business", "politics", "artificial_intelligence"] },
  { title: "AI legal assistant passes bar exam with 95th percentile score", topics: ["artificial_intelligence", "business"] },
  { title: "5G satellite internet reaches 90% global coverage", topics: ["space", "technology"] },
  { title: "Renewable energy surpasses fossil fuels for first time in US history", topics: ["climate", "economy"] },
  { title: "Global supply chain AI tracking reduces shipping delays by 40%", topics: ["business", "artificial_intelligence"] },
  { title: "New social network challenges Twitter with decentralized architecture", topics: ["media", "startups", "big_tech"] },
];

const ENTITIES_POOL = [
  "OpenAI", "Google", "Meta", "Apple", "Microsoft", "Amazon", "Nvidia",
  "Anthropic", "Tesla", "SpaceX", "Hugging Face", "Stability AI", "Perplexity",
  "DeepMind", "Claude", "ChatGPT", "Gemini", "LLaMA", "Copilot",
  "GitHub", "AWS", "Azure", "EU", "NIST", "CISA", "FDA", "NASA", "WHO",
  "Sam Altman", "Sundar Pichai", "Satya Nadella", "Tim Cook",
  "TypeScript", "Rust", "Python", "PostgreSQL", "Kubernetes", "Docker",
  "React", "Supabase", "Firebase", "Cloudflare",
  "CRISPR", "mRNA", "fusion energy", "quantum computing",
  "zero-day", "ransomware", "phishing", "DDoS",
];

const SNIPPET_TEMPLATES = [
  "The latest development in {topic} marks a significant shift in how companies approach {topic} challenges.",
  "Industry experts say this {topic} breakthrough could reshape the competitive landscape for years to come.",
  "This announcement comes amid growing demand for {topic} solutions in both enterprise and consumer markets.",
  "With this new {topic} capability, developers can now build applications that were previously impossible.",
  "The {topic} initiative has drawn attention from regulators, investors, and technologists worldwide.",
  "Early benchmarks show remarkable improvements in {topic} performance compared to previous generations.",
  "Market analysts predict the {topic} sector will see continued growth as adoption accelerates.",
  "This is the first time a {topic} system has achieved these results at scale.",
  "The team behind this {topic} project says they have been working on it for over two years.",
  "Partnerships with major {topic} providers are expected to drive mainstream adoption.",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomEntityString(count: number): string {
  const shuffled = shuffle(ENTITIES_POOL);
  return JSON.stringify(shuffled.slice(0, Math.min(count, shuffled.length)));
}

function randomTopicsString(count: number): string {
  const shuffled = shuffle([...TOPICS]);
  return JSON.stringify(shuffled.slice(0, Math.min(count, shuffled.length)));
}

function generateCanonicalUrl(index: number, source: string): string {
  const slug = `article-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const domain = source.toLowerCase().replace(/\s+/g, "") + ".com";
  return `https://${domain}/tech/${slug}`;
}

function generatePublishedAt(): Date {
  const now = new Date();
  const hoursBack = Math.random() * 48;
  return new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
}

function generateSnippet(title: string): string {
  const topic = title.toLowerCase().split(" ").slice(0, 3).join(" ");
  const template = pick(SNIPPET_TEMPLATES);
  return template.replace("{topic}", topic);
}

async function seedArticles(count: number) {
  console.log(`Seeding ${count} articles...`);
  const articles = [];
  const usedUrls = new Set<string>();
  
  // Generate articles using HEADLINES as base and adding variations
  for (let i = 0; i < count; i++) {
    const headlineTemplate = pick(HEADLINES);
    const source = pick(UNIQUE_SOURCES);
    let canonicalUrl = generateCanonicalUrl(i, source);
    
    // Ensure uniqueness
    while (usedUrls.has(canonicalUrl)) {
      canonicalUrl = generateCanonicalUrl(i + 10000, source);
    }
    usedUrls.add(canonicalUrl);

    articles.push({
      canonical_url: canonicalUrl,
      source_name: source,
      title: headlineTemplate.title,
      snippet: generateSnippet(headlineTemplate.title),
      published_at: generatePublishedAt(),
      language: "en",
      provider: "seed",
      editorial_priority: Math.floor(Math.random() * 5) + 1,
    });

    // Avoid exact duplicates to ensure we have unique data
    if (i > 0 && i % HEADLINES.length === 0) {
      // Add suffix to title to differentiate
      const lastArticle = articles[articles.length - 1];
      articles[articles.length - 1] = {
        ...lastArticle,
        title: `${lastArticle.title} #${i}`,
      };
    }
  }

  // Batch insert in chunks of 100 to avoid memory limits and timeouts
  const CHUNK_SIZE = 100;
  for (let i = 0; i < articles.length; i += CHUNK_SIZE) {
    const chunk = articles.slice(i, i + CHUNK_SIZE);
    await db.articles.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Inserted articles ${i + 1}–${Math.min(i + CHUNK_SIZE, articles.length)}`);
  }

  console.log(`✅ ${articles.length} articles seeded`);
  return articles.length;
}

async function seedAnnotations() {
  console.log("Seeding article annotations (mock classifier)...");
  
  const unannotated = await db.articles.findMany({
    where: {
      article_annotations: { is: null },
      provider: "seed",
    },
    select: { id: true },
  });

  if (unannotated.length === 0) {
    console.log("  No unannotated articles found - skipping annotation step");
    return 0;
  }

  console.log(`  Found ${unannotated.length} unannotated articles`);

  const CHUNK_SIZE = 100;
  let totalAnnotated = 0;

  for (let i = 0; i < unannotated.length; i += CHUNK_SIZE) {
    const chunk = unannotated.slice(i, i + CHUNK_SIZE);
    
    const annotationData = chunk.map((article) => {
      const topicCount = Math.floor(Math.random() * 3) + 1;
      const entityCount = Math.floor(Math.random() * 4) + 1;
      
      return {
        article_id: article.id,
        topics_json: randomTopicsString(topicCount),
        entities_json: randomEntityString(entityCount),
        quality_score: Math.floor(Math.random() * 5) + 1,
        dedupe_key: `dedupe-${article.id}-${Math.random().toString(36).slice(2, 8)}`,
      };
    });

    await db.article_annotations.createMany({
      data: annotationData,
      skipDuplicates: true,
    });
    
    totalAnnotated += chunk.length;
    console.log(`  Annotated ${totalAnnotated} articles so far`);
  }

  console.log(`✅ ${totalAnnotated} annotations created`);
  return totalAnnotated;
}

async function seedTestUser() {
  console.log("Creating test user and onboarding data...");
  
  const testEmail = `test-user-${Date.now()}@example.com`;
  // Generate a valid UUID v4
  const hex = (n: number) => Math.floor(Math.random() * Math.pow(16, n)).toString(16).padStart(n, '0');
  const uuid = `${hex(8)}-${hex(4)}-4${hex(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
  
  // Create user
  const user = await db.users.create({
    data: {
      id: uuid,
      email: testEmail,
      timezone: "America/New_York",
    },
  });
  console.log(`  ✅ User created: ${user.email} (${user.id})`);

  // Create user profile
  const profile = await db.user_profiles.create({
    data: {
      user_id: user.id,
      display_name: "Test User",
      onboarding_complete: true,
      brief_ready_hour_local: 7,
      consent_version_accepted: "1.0",
      is_admin: false,
    },
  });
  console.log(`  ✅ User profile created`);

  // Create topic preferences
  const PREFERRED_TOPICS = [
    "artificial_intelligence",
    "machine_learning",
    "software_engineering",
    "big_tech",
    "cybersecurity",
  ];

  for (const topic of PREFERRED_TOPICS) {
    await db.user_topic_preferences.create({
      data: {
        user_id: user.id,
        topic,
        weight: 1.0 + Math.random() * 0.5,
        source: "seed",
      },
    });
    console.log(`  ✅ Topic preference: ${topic}`);
  }

  return user;
}

async function generateBrief(user: { id: string }) {
  console.log(`Generating daily brief for user ${user.id}...`);
  
  // Get annotated articles with their topics
  const annotatedArticles = await db.articles.findMany({
    where: {
      article_annotations: { isNot: null },
      provider: "seed",
    },
    include: {
      article_annotations: true,
    },
    orderBy: {
      editorial_priority: "asc",
    },
    take: 50,
  });

  console.log(`  Found ${annotatedArticles.length} candidate articles`);

  // Get user's topic preferences
  const userPrefs = await db.user_topic_preferences.findMany({
    where: { user_id: user.id },
  });
  const preferredTopics = new Set(userPrefs.map((p) => p.topic));
  const topicWeights: Record<string, number> = {};
  for (const pref of userPrefs) {
    topicWeights[pref.topic] = pref.weight;
  }

  // Score and rank articles based on topic match
  const scoredArticles = annotatedArticles.map((article) => {
    let score = 0;
    if (article.article_annotations?.topics_json) {
      try {
        const topics: string[] = JSON.parse(article.article_annotations.topics_json);
        for (const topic of topics) {
          if (preferredTopics.has(topic)) {
            score += topicWeights[topic] || 1.0;
          }
        }
      } catch {}
    }
    // Add editorial priority boost (lower is better, invert it)
    score += (5 - article.editorial_priority) * 0.2;
    // Add quality score boost
    score += (article.article_annotations?.quality_score || 3) * 0.15;

    return { article, score };
  });

  // Sort by score descending, take top 5
  scoredArticles.sort((a, b) => b.score - a.score);
  const top5 = scoredArticles.slice(0, 5);

  console.log(`  Top 5 ranked articles:`);
  for (const [index, item] of top5.entries()) {
    console.log(`    #${index + 1}: "${item.article.title}" (score: ${item.score.toFixed(2)})`);
  }

  // Create daily brief
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const briefDate = today;

  const startTime = Date.now();

  const brief = await db.daily_briefs.create({
    data: {
      user_id: user.id,
      brief_date: briefDate,
      status: "completed",
      generated_at: new Date(),
      generation_duration_ms: 1234,
      candidate_count: annotatedArticles.length,
      version_tag: "v0.1",
    },
  });
  console.log(`  ✅ Brief created: ID ${brief.id}`);

  // Create brief items for top 5
  for (const [rank, item] of top5.entries()) {
    const matchedTopics: string[] = [];
    if (item.article.article_annotations?.topics_json) {
      try {
        const topics: string[] = JSON.parse(item.article.article_annotations.topics_json);
        for (const topic of topics) {
          if (preferredTopics.has(topic)) {
            matchedTopics.push(topic.replace(/_/g, " "));
          }
        }
      } catch {}
    }

    await db.daily_brief_items.create({
      data: {
        daily_brief_id: brief.id,
        article_id: item.article.id,
        rank: rank + 1,
        score: parseFloat(item.score.toFixed(4)),
        summary: item.article.snippet || item.article.title.substring(0, 150),
        why_recommended: matchedTopics.length > 0
          ? `Matched your interests in: ${matchedTopics.join(", ")}`
          : "High editorial priority article",
      },
    });
  }

  const duration = Date.now() - startTime;
  console.log(`  🔥 Brief generation took ${duration}ms`);

  return brief;
}

async function runVerification() {
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION REPORT");
  console.log("=".repeat(60) + "\n");

  // 1. Total articles
  const totalArticles = await db.articles.count();
  console.log(`1. Total articles: ${totalArticles}`);

  // 2. Total annotations
  const totalAnnotations = await db.article_annotations.count();
  console.log(`2. Total annotations: ${totalAnnotations}`);

  // 3. Unique canonical_urls
  const distinctUrls = await db.articles.findMany({
    select: { canonical_url: true },
    orderBy: { canonical_url: "asc" },
  });
  const uniqueUrlCount = new Set(distinctUrls.map((d) => d.canonical_url)).size;
  console.log(`3. Unique canonical URLs: ${uniqueUrlCount} (total: ${distinctUrls.length})`);
  if (uniqueUrlCount === distinctUrls.length) {
    console.log(`   ✅ All canonical URLs are unique`);
  } else {
    console.log(`   ❌ Found duplicate URLs!`);
  }

  // 4. Articles by source
  const articlesBySource = await db.articles.groupBy({
    by: ["source_name"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log(`\n4. Articles by source:`);
  for (const row of articlesBySource) {
    console.log(`   ${row.source_name}: ${row._count.id}`);
  }

  // 5. Test user topics
  const testUser = await db.users.findFirst({
    where: { email: { contains: "test-user-" } },
    include: {
      user_topic_preferences: true,
    },
  });

  if (testUser) {
    console.log(`\n5. Test user (${testUser.email}) topic preferences:`);
    for (const pref of testUser.user_topic_preferences) {
      console.log(`   - ${pref.topic} (weight: ${pref.weight})`);
    }
  }

  // 6. Brief generated
  const latestBrief = await db.daily_briefs.findFirst({
    where: { user_id: testUser?.id },
    orderBy: { generated_at: "desc" },
  });
  
  if (latestBrief) {
    console.log(`\n6. Latest brief:`);
    console.log(`   Status: ${latestBrief.status}`);
    console.log(`   Generation duration: ${latestBrief.generation_duration_ms}ms`);
    console.log(`   Candidate count: ${latestBrief.candidate_count}`);
    console.log(`   Brief date: ${latestBrief.brief_date.toISOString().split("T")[0]}`);

    // 7. Brief items count
    const briefItemsCount = await db.daily_brief_items.count({
      where: { daily_brief_id: latestBrief.id },
    });
    console.log(`\n7. Brief items count: ${briefItemsCount}`);

    // 8. Show ranked items
    console.log(`\n8. Ranked brief items:`);
    const briefItems = await db.daily_brief_items.findMany({
      where: { daily_brief_id: latestBrief.id },
      orderBy: { rank: "asc" },
      include: { article: true },
    });

    for (const item of briefItems) {
      console.log(`\n   Rank #${item.rank}:`);
      console.log(`   Score: ${item.score}`);
      console.log(`   Article: "${item.article?.title || "N/A"}"`);
      console.log(`   Summary: ${item.summary || "N/A"}`);
      console.log(`   Why recommended: ${item.why_recommended || "N/A"}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SEED SCRIPT COMPLETE");
  console.log("=".repeat(60));
}

async function main() {
  console.log("🚀 Starting AI News E2E Seed Script\n");
  
  try {
    // Step 1: Seed 250+ articles
    const articleCount = await seedArticles(260);
    console.log("");

    // Step 2: Seed annotations (mock classifier)
    const annotationCount = await seedAnnotations();
    console.log("");

    // Step 3: Create test user and onboard
    const testUser = await seedTestUser();
    console.log("");

    // Step 4: Generate daily brief
    const brief = await generateBrief(testUser);
    console.log("");

    // Step 5: Verify and report
    await runVerification();
  } catch (error) {
    console.error("❌ Seed script failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
