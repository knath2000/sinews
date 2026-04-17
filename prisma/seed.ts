import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Topic Taxonomy (18 topics) ──────────────────────────────────────────────
const TAXONOMY = [
  "AI & Machine Learning",
  "Big Tech",
  "Startups & Venture Capital",
  "Cybersecurity & Privacy",
  "Software Engineering",
  "Cloud & Infrastructure",
  "Markets & Finance",
  "Science & Research",
  "Robotics & Automation",
  "Consumer Tech",
  "Space & Aerospace",
  "Biotech & Health Tech",
  "Climate & Energy Tech",
  "Semiconductors & Hardware",
  "Gaming & Entertainment",
  "Education Technology",
  "Regulatory & Policy",
  "Open Source",
];

const TOPIC_ENTITIES: Record<string, string[]> = {
  "AI & Machine Learning": ["OpenAI", "Google DeepMind", "Anthropic", "Meta AI", "Sam Altman", "Demis Hassabis", "GPT-5", "Claude", "Gemini"],
  "Big Tech": ["Google", "Apple", "Microsoft", "Amazon", "Meta", "Sundar Pichai", "Tim Cook", "Satya Nadella"],
  "Startups & Venture Capital": ["Sequoia Capital", "a16z", "Y Combinator", "Stripe", "Rivet", "Figma", "Linear"],
  "Cybersecurity & Privacy": ["CrowdStrike", "Cloudflare", "CrowdStrike", "Palo Alto Networks", "CISA", "NSA"],
  "Software Engineering": ["GitHub", "VS Code", "JetBrains", "Rust", "TypeScript", "Linus Torvalds", "Kubernetes"],
  "Cloud & Infrastructure": ["AWS", "Google Cloud", "Azure", "Vercel", "Cloudflare", "Terraform"],
  "Markets & Finance": ["NVIDIA", "Tesla", "S&P 500", "Federal Reserve", "BlackRock", "Goldman Sachs"],
  "Science & Research": ["Nature", "MIT", "Stanford", "CERN", "Arxiv", "DeepMind"],
  "Robotics & Automation": ["Boston Dynamics", "Figure AI", "Tesla Optimus", "Agility Robotics", "1X Technologies"],
  "Consumer Tech": ["iPhone", "Samsung", "AirPods", "Vision Pro", "Pixel", "Nintendo"],
  "Space & Aerospace": ["SpaceX", "Starlink", "NASA", "Blue Origin", "Elon Musk", "ESA"],
  "Biotech & Health Tech": ["Moderna", "23andMe", "CRISPR Therapeutics", "Epic Systems", "Tempus", "Roche"],
  "Climate & Energy Tech": ["Tesla", "Sunrun", "Rivian", "Northvolt", "NextEra Energy", "Carbon Engineering"],
  "Semiconductors & Hardware": ["NVIDIA", "AMD", "TSMC", "Intel", "ARM", "Samsung", "ASML"],
  "Gaming & Entertainment": ["Sony", "Xbox", "Nintendo", "Steam", "Epic Games", "Roblox", "Unity"],
  "Education Technology": ["Khan Academy", "Coursera", "Duolingo", "Google Classroom", "Blackboard"],
  "Regulatory & Policy": ["FTC", "EU Commission", "DOJ", "FCC", "GDPR", "AI Act"],
  "Open Source": ["Linux Foundation", "Hugging Face", "Meta", "Apache", "Rust-lang", "Docker"],
};

// ─── Source configs ──────────────────────────────────────────────────────────
const SOURCES = [
  { name: "TechCrunch", provider: "rss" },
  { name: "The Verge", provider: "rss" },
  { name: "Ars Technica", provider: "rss" },
  { name: "Wired", provider: "rss" },
  { name: "MIT Technology Review", provider: "rss" },
  { name: "Bloomberg", provider: "api" },
  { name: "Reuters", provider: "api" },
  { name: "VentureBeat", provider: "rss" },
];

// ─── 220 realistic article titles grouped by source + topic ──────────────────
const ARTICLE_DATA: { sourceIdx: number; topic: string; titles: string[] }[] = [
  {
    sourceIdx: 0, // TechCrunch
    topic: "AI & Machine Learning",
    titles: [
      "OpenAI reportedly in talks for a $40 billion funding round at $300B valuation",
      "Anthropic launches Claude 4 with multi-modal reasoning and code execution",
      "Meta AI releases Llama 4 405B, claiming state-of-the-art open-source performance",
      "Google DeepMind unveils new reinforcement learning approach for robotic control",
      "Startup Mistral AI raises €600M to compete in the European LLM market",
      "xAI's Grok 3 shows impressive math reasoning in new benchmark results",
      "Cohere introduces command-r model optimized for enterprise RAG pipelines",
      "AI startup Runway announces video generation model with 4K output capabilities",
      "Researchers demonstrate that LLMs can self-correct hallucinations with structured feedback",
      "Stability AI pivots to enterprise after struggling with consumer subscription revenue",
      "New study shows AI coding assistants increase developer productivity by 40%",
      "Hugging Face launches Inference Endpoints v3 with auto-scaling GPU support",
      "Open-sourcing vs closed: The debate over foundation model release strategies intensifies",
      "AI translation startup DeepL achieves human-level accuracy on legal document translation",
      "Perplexity AI expands Pro search with deeper source attribution and fact-checking",
    ],
  },
  {
    sourceIdx: 0,
    topic: "Startups & Venture Capital",
    titles: [
      "Y Combinator Demo Day 2026: 12 startups to watch from the latest batch",
      "Rivian secures $2.5B from Amazon for next-gen delivery vehicle development",
      "Figma competitor Penpot raises $50M Series B, targeting enterprise design teams",
      "Stripe launches revenue-based financing product for SaaS startups",
      "Sequoia Capital debuts new $4B fund focused on AI infrastructure startups",
      "Harvey AI, the legal-tech darling, hits $1.5B valuation in latest round",
      "Climate-tech startup Twelve raises $300M for carbon capture technology",
      "A European VC boom: Atomico reports record €8B deployed in Q1 2026",
      "Linear raises $100M at $1.5B valuation as project management wars heat up",
    ],
  },
  {
    sourceIdx: 0,
    topic: "Cybersecurity & Privacy",
    titles: [
      "Critical vulnerability in widely used Python package affects 50,000 repositories",
      "CrowdStrike reports 300% increase in AI-powered phishing attacks targeting enterprises",
      "CISA issues emergency directive after critical Windows vulnerability discovered",
      "Cloudflare launches zero-trust platform specifically for small and mid-size businesses",
      "Mandiant discovers nation-state group targeting cloud infrastructure in supply chain attack",
      "New browser-based cryptojacking campaign hijacks 10M+ sessions per week",
    ],
  },
  {
    sourceIdx: 0,
    topic: "Software Engineering",
    titles: [
      "Rust adoption surges: now the third-most loved language in Stack Overflow survey",
      "GitHub Copilot workspace can now plan, implement, and test entire features autonomously",
      "TypeScript 6.0 introduces first-class pattern matching and algebraic data types",
      "Kubernetes 1.33 introduces native sidecar containers and improved service mesh support",
      "JetBrains releases Fleet 2.0 with collaborative editing and built-in AI assistant",
      "New database language aims to replace SQL with a type-safe alternative",
    ],
  },
  {
    sourceIdx: 1, // The Verge
    topic: "Big Tech",
    titles: [
      "Apple's iOS 19 brings a completely redesigned Siri with on-device LLM integration",
      "Amazon's Alexa 3.0 uses large language models for conversational smart home control",
      "Microsoft announces Copilot+ PCs with Snapdragon X Elite chips and 40-hour battery life",
      "Google's new Pixel 10 features Tensor G5 with dedicated AI accelerator",
      "Meta's Ray-Ban smart glasses get a major AI upgrade with live translation",
      "Apple Vision Pro 2 reportedly coming with lighter design and $1,500 price tag",
      "Google search gets a major overhaul with AI-generated summaries and shopping features",
      "Microsoft Office apps get deeper Copilot integration with natural language formulas",
      "Amazon expands same-day delivery to 100 new cities amid retail competition",
      "Apple and Google face new antitrust scrutiny over app store policies in the EU",
      "Microsoft's Activision deal brings Call of Duty to Game Pass on day one",
    ],
  },
  {
    sourceIdx: 1,
    topic: "Consumer Tech",
    titles: [
      "Samsung Galaxy Ring 2 adds health tracking features including blood pressure monitoring",
      "Nintendo Switch 2 launch lineup includes Mario Kart 10 and a new Zelda title",
      "Tesla's Cybertruck gets a mid-cycle refresh with improved range and towing capacity",
      "AirPods Pro 3 feature adaptive audio that learns your listening environments",
      "Steam Deck 2 leaks show a bigger screen and more powerful AMD chip",
      "Sony WH-1000XM7 headphones set a new benchmark for active noise cancellation",
      "Roblox hits 100M daily active users, announces creator monetization overhaul",
      "Dyson's robot vacuum AI can now identify and avoid 200+ object types",
    ],
  },
  {
    sourceIdx: 1,
    topic: "Regulatory & Policy",
    titles: [
      "EU AI Act enforcement begins: first fines issued for non-compliant foundation models",
      "US Senate proposes bipartisan bill to regulate AI deepfake generation in elections",
      "TikTok faces new ownership deadline as Congress tightens foreign app restrictions",
      "FTC launches investigation into AI data scraping practices of major tech companies",
      "UK proposes new digital markets unit to regulate Google and Apple's duopoly power",
    ],
  },
  {
    sourceIdx: 2, // Ars Technica
    topic: "Cloud & Infrastructure",
    titles: [
      "AWS announces Graviton 5 processors with 40% better price-performance for cloud workloads",
      "Vercel's Next.js 15 introduces server-side streaming and edge function improvements",
      "Google Cloud spanner introduces vector search capabilities for AI workloads",
      "HashiCorp Terraform Cloud gets AI-powered infrastructure planning and cost estimation",
      "Cloudflare Workers now support WebAssembly component model for high-performance edge computing",
      "Azure introduces confidential computing VMs with hardware-level encryption for enterprise AI",
      "Kong API gateway 4.0 brings AI-driven rate limiting and intelligent traffic routing",
    ],
  },
  {
    sourceIdx: 2,
    topic: "Cybersecurity & Privacy",
    titles: [
      "Major data breach at Equifax exposes financial records of 150 million consumers",
      "New ransomware group 'Phantom Lock' demands cryptocurrency-only payments from hospitals",
      "Palo Alto Networks acquires AI security startup for $2.3B to bolster threat detection",
      "Signal introduces new group calling feature with end-to-end encrypted video conferences",
      "Researchers discover critical flaw in popular VPN software affecting 20M users worldwide",
      "Zero-day exploit in Cisco router firmware enables persistent remote code execution",
      "Post-quantum cryptography standard NIST PQC-3 sees first real-world deployment in Chrome",
    ],
  },
  {
    sourceIdx: 2,
    topic: "Science & Research",
    titles: [
      "Nature publishes breakthrough paper on room-temperature superconductor candidate material",
      "Stanford researchers achieve 95% accuracy in early cancer detection via blood test",
      "CERN's upgraded Large Hadron Collider discovers new heavy quark state",
      "MIT team develops programmable DNA storage with 10x higher density than previous methods",
      "DeepMind AI predicts 200 million protein structures in massive AlphaFold update",
      "ArXiv introduces verified peer-review layer following concerns about preprint quality",
      "James Webb telescope detects potential biosignature gases in an exoplanet atmosphere",
    ],
  },
  {
    sourceIdx: 3, // Wired
    topic: "Robotics & Automation",
    titles: [
      "Figure AI's humanoid robot demonstrates autonomous kitchen cleanup in new demo video",
      "Boston Dynamics' Atlas electric model can now navigate unstructured construction sites",
      "Tesla Optimus gen 3 shows impressive dexterity in factory assembly tasks",
      "Agility Robotics begins commercial delivery of Digit robots to warehouse customers",
      "1X Technologies unveils NEO beta, a humanoid robot designed for home companion tasks",
      "Japan's Preferred Networks achieves 99.5% accuracy in robotic assembly line quality inspection",
      "Soft robotics startup develops self-healing gripper that can handle fragile objects",
    ],
  },
  {
    sourceIdx: 3,
    topic: "Regulatory & Policy",
    titles: [
      "Inside the race to watermark AI-generated content: C2PA and competing standards",
      "California passes nation's strictest AI transparency law requiring disclosure of synthetic media",
      "The global AI governance gap: why international coordination on AI safety remains elusive",
      "WHO issues first guidelines on AI use in clinical decision-making and drug discovery",
      "How the EU's Digital Markets Act is reshaping app distribution across Europe",
      "The fight over AI training data copyright reaches the Supreme Court",
    ],
  },
  {
    sourceIdx: 3,
    topic: "Education Technology",
    titles: [
      "Khan Academy's Khanmigo AI tutor now supports 15 languages and math reasoning from K-12",
      "Duolingo launches Max tier with GPT-4 powered conversation practice for 40 languages",
      "Coursera partners with 50 universities to offer fully AI-personalized degree paths",
      "Google Classroom introduces real-time AI feedback on student writing assignments",
      "Ed-tech startup Outschool raises $150M to expand live online classes for kids",
    ],
  },
  {
    sourceIdx: 4, // MIT Technology Review
    topic: "AI & Machine Learning",
    titles: [
      "The hidden environmental cost of training large AI models: a detailed analysis",
      "Why AI alignment researchers are worried about deceptive alignment in larger models",
      "Can AI help solve the climate crisis? New research shows promising early results",
      "A survey of 1,000 AI researchers reveals growing concern about AGI timelines",
      "Neuromorphic computing reaches a milestone: chip that mimics brain circuits runs on 1/1000th the power",
      "The rise of AI agents: autonomous systems that plan, act, and adapt in real-time",
      "Small language models are catching up: why 7B models can sometimes outperform 70B",
      "How synthetic data is becoming the new bottleneck for AI training",
      "The AI safety field is growing up — but is it growing fast enough?",
    ],
  },
  {
    sourceIdx: 4,
    topic: "Science & Research",
    titles: [
      "The ethics of brain-computer interfaces: when machines read your thoughts",
      "CRISPR 2.0: new gene editing technique promises fewer off-target mutations",
      "Fusion energy startup Commonwealth Fusion achieves net-positive energy for 5 minutes",
      "Ocean cleanup startup removes 10M kg of plastic from the Great Pacific Garbage Patch",
      "CRISPR-based gene therapy cures sickle cell disease in landmark clinical trial results",
      "Quantum computing breakthrough: 1000-qubit processor achieves quantum advantage on optimization",
    ],
  },
  {
    sourceIdx: 4,
    topic: "Climate & Energy Tech",
    titles: [
      "Northvolt's new lithium refining process cuts carbon emissions by 60%",
      "Carbon Engineering announces direct air capture plant that can remove 1M tons CO2 per year",
      "Form Energy's iron-air battery achieves 100-hour grid-scale energy storage milestone",
      "Solar startup Heliogen uses AI to optimize concentrated solar thermal power generation",
      "Tesla Megapack factory ramps production to support global grid battery demand",
    ],
  },
  {
    sourceIdx: 5, // Bloomberg
    topic: "Markets & Finance",
    titles: [
      "NVIDIA stock surges 8% as data center revenue hits record $30B in a single quarter",
      "Fed signals potential rate cut as AI-driven productivity gains cool inflation",
      "BlackRock's Bitcoin ETF surpasses $100B in assets under management",
      "Wall Street banks spend $5B on AI trading systems amid quant competition",
      "Tesla shares jump 12% after Optimus robot demonstration drives investor optimism",
      "Saudi Arabia's PIF invests $3B in AI startup ecosystem as Vision 2030 accelerates",
      "Goldman Sachs launches AI-powered portfolio management service for retail investors",
      "S&P 500 reaches new all-time high driven by tech sector's AI-related earnings",
      "Crypto market cap hits $5T as Bitcoin approaches $150K and ETH sees DeFi surge",
      "Hedge fund Renaissance Technologies reports 45% returns driven by AI trading strategies",
      "SoftBank Vision Fund 3 raises $40B with focus on AI and robotics investments",
      "Intel's foundry business secures $10B in new government subsidies for US chip production",
      "Rivian stock climbs after Q2 delivery numbers beat analyst expectations by 30%",
    ],
  },
  {
    sourceIdx: 5,
    topic: "Big Tech",
    titles: [
      "Amazon's $10B investment in AI data centers signals cloud infrastructure arms race",
      "Google parent Alphabet posts record $90B quarterly revenue fueled by AI ad products",
      "Microsoft's cloud revenue surpasses $40B as enterprise copilot adoption accelerates",
      "Apple's services revenue hits $25B quarterly record driven by App Store and Apple TV+",
      "Meta spends $20B on AI infrastructure this quarter, surpassing analyst expectations",
      "Oracle's cloud business grows 45% as enterprise clients migrate database workloads",
      "Palantir stock soars 50% after AI platform wins $3B in government contracts",
    ],
  },
  {
    sourceIdx: 5,
    topic: "Biotech & Health Tech",
    titles: [
      "Moderna's mRNA cancer vaccine shows promising phase 3 results in melanoma treatment",
      "Tempus AI files for IPO with $8B valuation, bringing healthcare AI to public markets",
      "Insilico Medicine discovers new drug candidate using AI in record 18-month timeline",
      "Epic Systems integrates generative AI into electronic health records across 300 hospitals",
      "23andMe pivots to drug development after consumer genetics revenue declines 25%",
    ],
  },
  {
    sourceIdx: 6, // Reuters
    topic: "Markets & Finance",
    titles: [
      "Global chip shortage eases as TSMC and Samsung ramp up advanced node production",
      "European Central Bank cuts rates to historic low amid recession concerns in the eurozone",
      "China's EV exports surpass 4M units annually, reshaping the global automotive market",
      "India's IT sector reports record $300B revenue as AI consulting demand surges globally",
      "Semiconductor equipment maker ASML reports record orders for EUV lithography machines",
      "World Bank revises global GDP growth forecast upward to 3.5% citing AI productivity boost",
      "Japan's yen weakens past 160 against dollar as BOJ maintains ultra-loose monetary policy",
    ],
  },
  {
    sourceIdx: 6,
    topic: "Space & Aerospace",
    titles: [
      "SpaceX Starship completes first orbital refueling demonstration ahead of Artemis mission",
      "Blue Origin's New Glenn rocket successfully delivers communications satellite to orbit on maiden flight",
      "NASA's Artemis III mission timeline pushed to late 2027 due to spacesuit development delays",
      "Starlink subscriber count surpasses 15M as satellite internet expands to 70 countries",
      "ESA approves new Earth observation constellation for climate monitoring at $3B cost",
      "Virgin Galactic announces commercial space tourism flights to resume with improved vehicle",
      "Rocket Lab reaches 500th successful launch milestone with Electron rocket",
      "SpaceX launches 60 Starlink V3 satellites with improved laser inter-satellite links",
    ],
  },
  {
    sourceIdx: 6,
    topic: "Semiconductors & Hardware",
    titles: [
      "TSMC begins risk production of 2nm process node, promising 25% performance improvement",
      "AMD's MI400 AI accelerator benchmarks show 3x improvement over MI300X in LLM inference",
      "Intel unveils Lunar Lake processors with integrated NPU delivering 100 TOPS for edge AI",
      "ARM announces next-gen Cortex-X9 CPU core with 50% IPC improvement for mobile devices",
      "Samsung's HBM4 memory chips ship to NVIDIA for next-generation GPU architectures",
      "RISC-V ecosystem grows as major chipmakers adopt the open instruction set architecture",
      "ASML's High-NA EUV machine achieves first patterned wafers at chipmaker customer site",
    ],
  },
  {
    sourceIdx: 7, // VentureBeat
    topic: "AI & Machine Learning",
    titles: [
      "Enterprise AI adoption survey: 78% of Fortune 500 companies now use LLMs in production",
      "Startup Scale AI launches new data curation platform for autonomous vehicle training",
      "AI in healthcare: FDA approves three new AI diagnostic tools for medical imaging in Q2",
      "Databricks announces AI/BI feature allowing natural language queries on data lakehouses",
      "LangChain introduces LangGraph 2.0 with improved multi-agent orchestration capabilities",
      "Autonomous AI coding startup Devin demonstrates end-to-end app development in 6 hours",
      "Google's new open-weight Gemma 3 model challenges proprietary APIs in reasoning tasks",
      "Salesforce Einstein GPT 3 brings predictive analytics to CRM workflows with natural language",
      "AI-powered drug discovery startup Recursion Pharmaceuticals reports successful phase 2 trial",
      "OpenAI's Sora video generation model now available in API with 4-minute video clips",
    ],
  },
  {
    sourceIdx: 7,
    topic: "Software Engineering",
    titles: [
      "Docker Compose v3 introduces native GPU passthrough and multi-architecture builds",
      "Supabase launches real-time AI embeddings for instant vector search on any Postgres table",
      "Deno 3.0 brings native TypeScript execution and built-in package management to the runtime",
      "Sourcegraph adds AI-powered code search that understands semantic context across repos",
      "New database tool enables zero-downtime migrations for PostgreSQL at petabyte scale",
      "Bun 2.0 runtime achieves 5x faster startup and complete Node.js compatibility",
      "GitHub Actions introduces AI-powered workflow optimization that reduces CI/CD costs by 40%",
      "PostgreSQL 17 introduces incremental backups and improved JSONB performance by 3x",
    ],
  },
  {
    sourceIdx: 7,
    topic: "Startups & Venture Capital",
    titles: [
      "AI voice cloning startup ElevenLabs hits $3B valuation after raising $200M Series C",
      "Ramp, the corporate card startup, expands into AI-powered expense management automation",
      "Notion raises $500M at $20B valuation as AI features drive massive user growth",
      "Devin AI coding agent raises $300M Series B, valued at $2B after viral demo",
      "Cognition Labs expands beyond Devin with new AI product line for QA and testing",
      "Arc browser company The Browser Company raises $150M at $1B valuation for AI search features",
    ],
  },
  // ── Extra batch to reach 220 unique ──
  {
    sourceIdx: 3, // Wired
    topic: "Gaming & Entertainment",
    titles: [
      "Epic Games announces Unreal Engine 6 with real-time AI-generated NPCs and dynamic storytelling",
      "Unity launches new AI toolset for automated level design and asset generation in mobile games",
      "PlayStation 5 Pro features upgraded GPU with ray tracing improvements and 8K upscaling support",
      "Valve releases Steam Hardware survey showing Linux gaming share reaches record 15% market penetration",
      "RoboCop meets AI: new game uses generative AI to create unique storylines per player session",
      "Twitch introduces AI-powered real-time content moderation with 95% accuracy on harmful streams",
      "Xbox Cloud Gaming adds mobile streaming support with 5-minute instant play for AAA titles",
      "Blizzard confirms Diablo 4 expansion featuring AI-driven dynamic difficulty adjustment system",
    ],
  },
  {
    sourceIdx: 4, // MIT Technology Review
    topic: "Open Source",
    titles: [
      "Linux Foundation launches LF AI & Data division with $100M fund for open-source ML tools",
      "Docker announces container security scanning with AI-powered vulnerability detection in Docker Hub",
      "Meta open-sources new PyTorch optimization library achieving 3x speedup on transformer models",
      "The Apache Software Foundation celebrates 25 years of open-source governance and community development",
      "RISC-V Foundation gains 50 new corporate members including Qualcomm, Samsung, and Western Digital",
      "Mozilla launches open-source browser engine experiment focused on privacy-first web rendering",
    ],
  },
  {
    sourceIdx: 0, // TechCrunch
    topic: "Biotech & Health Tech",
    titles: [
      "Insilico Medicine discovers first AI-designed drug candidate entering phase 2 human clinical trials",
      "Google Health AI achieves 98% accuracy in detecting diabetic retinopathy from retinal scans in new study",
      "CRISPR Therapeutics reports successful gene editing treatment for beta-thalassemia in phase 3 trial",
      "Startup NotCo uses AI to create plant-based protein products indistinguishable from animal originals",
      "Epic Systems launches AI-powered clinical decision support module across 500+ hospital systems",
      "23andMe partners with pharmaceutical companies for targeted drug development using genetic data",
    ],
  },
  {
    sourceIdx: 5, // Bloomberg
    topic: "Climate & Energy Tech",
    titles: [
      "Commonwealth Fusion Systems achieves 100 seconds of sustained fusion reaction, setting new industry record",
      "Rivian announces R2 electric SUV starting at $45,000 with 300-mile range and Level 3 autonomous features",
      "Form Energy completes construction of first utility-scale iron-air battery facility for grid storage",
      "Heliogen raises $200M to scale AI-optimized concentrated solar power installations across Middle East",
      "Carbon capture startup Svante secures $500M Series D to commercialize point-source CO2 capture at 100M tons scale",
    ],
  },
  {
    sourceIdx: 2, // Ars Technica
    topic: "Space & Aerospace",
    titles: [
      "Axiom Space breaks ground on first commercial space station module for low-Earth orbit habitation",
      "Northrop Grumman develops new satellite servicing robot capable of extending spacecraft lifespan by 10 years",
    ],
  },
  {
    sourceIdx: 6, // Reuters
    topic: "Regulatory & Policy",
    titles: [
      "India introduces comprehensive data protection regulation modeled after GDPR with cross-border transfer rules",
      "Brazil's central bank launches instant payment system regulation for cryptocurrency exchanges operating nationally",
    ],
  },
  {
    sourceIdx: 1, // The Verge
    topic: "Software Engineering",
    titles: [
      "Swift 6.0 introduces structured concurrency improvements making async/await safer for Apple platform developers",
    ],
  },
];

// ─── Dedup targets: stories covered twice from different sources ──────────────
const DUPLICATE_PAIRS: { originalIdx: number; title: string; url: string }[] = [
  { originalIdx: 0, title: "OpenAI reportedly in talks for a $40 billion funding round", url: "https://theverge.com/openai-funding-round-40-billion" },
  { originalIdx: 5, title: "xAI Grok 3 shows impressive math reasoning benchmarks", url: "https://venturebeat.com/xai-grok3-benchmarks" },
  { originalIdx: 15, title: "Anthropic launches Claude 4 with multi-modal reasoning", url: "https://wired.com/anthropic-claude-4-launch" },
  { originalIdx: 30, title: "NVIDIA stock surges as data center revenue hits record", url: "https://reuters.com/nvidia-data-center-revenue-record" },
  { originalIdx: 52, title: "EU AI Act enforcement begins with first fines issued", url: "https://arstechnica.com/eu-ai-act-fines-issued" },
  { originalIdx: 68, title: "SpaceX Starship completes first orbital refueling demo", url: "https://techcrunch.com/spacex-starship-orbital-refueling" },
  { originalIdx: 72, title: "TSMC begins risk production of 2nm process node", url: "https://bloomberg.com/tsmc-2nm-production-risk" },
  { originalIdx: 87, title: "Figure AI humanoid robot demonstrates autonomous kitchen cleanup", url: "https://techcrunch.com/figure-ai-kitchen-cleanup-demo" },
  { originalIdx: 105, title: "Databricks announces AI/BI with natural language queries", url: "https://bloomberg.com/databricks-ai-bi-queries" },
  { originalIdx: 120, title: "DeepMind AI predicts 200 million protein structures", url: "https://reuters.com/deepmind-alphafold-200m-proteins" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomDate(hoursBack: number): Date {
  const now = Date.now();
  const past = now - hoursBack * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Main seed function ──────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding Phase 0 test data...\n");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // ── 1. Test user ──────────────────────────────────────────────────────
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

  console.log("1. Creating test user...");
  const user = await prisma.users.create({
    data: {
      id: TEST_USER_ID,
      email: "test@example.com",
      timezone: "America/Los_Angeles",
      created_at: now,
    },
  });
  console.log(`   ✓ User created: ${user.email} (${user.id})\n`);

  // ── 2. User profile ───────────────────────────────────────────────────
  console.log("2. Creating user profile...");
  const profile = await prisma.user_profiles.create({
    data: {
      user_id: TEST_USER_ID,
      display_name: "Test User",
      onboarding_complete: true,
      brief_ready_hour_local: 4,
      is_admin: true,
    },
  });
  console.log(`   ✓ Profile: ${profile.display_name} (admin: ${profile.is_admin})\n`);

  // ── 3. Topic preferences (10 of 18) ───────────────────────────────────
  console.log("3. Creating 10 topic preferences...");
  const preferredTopics = pickRandom(TAXONOMY, 10);
  for (const topic of preferredTopics) {
    await prisma.user_topic_preferences.create({
      data: {
        user_id: TEST_USER_ID,
        topic,
        weight: 1.0,
        source: "manual_topic",
      },
    });
    console.log(`   ✓ ${topic}`);
  }
  console.log("");

  // ── 4. 220 unique articles ────────────────────────────────────────────
  console.log("4. Inserting 220 unique articles...");
  const allArticles: { id: number; title: string; topic: string }[] = [];
  let articleCounter = 0;
  const articleTopicMap = new Map<number, string>();

  for (const group of ARTICLE_DATA) {
    const src = SOURCES[group.sourceIdx];
    for (const title of group.titles) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, "")
        .substring(0, 80);

      const publishedAt = randomDate(48);

      const article = await prisma.articles.create({
        data: {
          canonical_url: `https://${src.name.toLowerCase().replace(/ /g, "-")}.com/${slug}-${Date.now()}-${articleCounter}`,
          source_name: src.name,
          title: title,
          snippet: `In a recent development, ${title.toLowerCase()}. Industry experts say this could have significant implications for the technology sector. Further details are expected to emerge as companies respond to the announcement.`,
          published_at: publishedAt,
          language: "en",
          provider: src.provider,
          is_fixture: true,
          license_class: "fair_use",
          editorial_priority: randomInt(2, 5),
        },
      });

      articleTopicMap.set(article.id, group.topic);
      allArticles.push({ id: article.id, title, topic: group.topic });
      articleCounter++;

      if (articleCounter % 50 === 0) {
        console.log(`   → Inserted ${articleCounter} articles...`);
      }
    }
  }

  const uniqueCount = articleCounter;
  console.log(`   ✓ ${uniqueCount} unique articles inserted.\n`);

  // ── 5. 10 intentional duplicates ──────────────────────────────────────
  console.log("5. Inserting 10 intentional duplicates...");
  const dupArticles: number[] = [];
  for (const dup of DUPLICATE_PAIRS) {
    const src = SOURCES[1 - Math.floor(Math.random() * 8)] || SOURCES[0];
    const publishedAt = randomDate(48);

    const article = await prisma.articles.create({
      data: {
        canonical_url: dup.url,
        source_name: src.name,
        title: dup.title,
        snippet: `Duplicate coverage: ${dup.title.toLowerCase()}. This is an alternative source report on the same story for testing deduplication logic.`,
        published_at: publishedAt,
        language: "en",
        provider: src.provider,
        is_fixture: true,
        license_class: "fair_use",
        editorial_priority: randomInt(2, 4),
      },
    });

    articleTopicMap.set(article.id, articleTopicMap.get(dup.originalIdx) ?? "AI & Machine Learning");
    dupArticles.push(article.id);
    console.log(`   ✓ Dup #${dup.originalIdx + 1} → ${dup.url}`);
  }
  console.log(`   ✓ 10 duplicate articles inserted.\n`);

  const totalArticleCount = uniqueCount + dupArticles.length;
  console.log(`   Total articles (unique + dups): ${totalArticleCount}\n`);

  // ── 6. Annotations for ALL articles ───────────────────────────────────
  console.log("6. Creating annotations for all articles...");
  let annotationCount = 0;

  const annotationEntries = Array.from(articleTopicMap);
  for (let i = 0; i < annotationEntries.length; i++) {
    const articleId = annotationEntries[i][0];
    const topic = annotationEntries[i][1];
    // Pick 1-3 topics: always include the primary topic, plus 0-2 more
    const otherTopics = TAXONOMY.filter((t) => t !== topic);
    const extraTopics = pickRandom(otherTopics, randomInt(0, 2));
    const topics = [topic, ...extraTopics];

    // Pick 2-8 entities from relevant entity pools
    const relevantEntities = TOPIC_ENTITIES[topic] ?? [];
    const allEntities = Object.values(TOPIC_ENTITIES).flat();
    const mixedPool = [...relevantEntities, ...allEntities];
    const entities = pickRandom(mixedPool, randomInt(2, 8));

    const qualityScore = randomInt(2, 5);
    const dedupeKey = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_story_" + articleId;

    await prisma.article_annotations.create({
      data: {
        article_id: articleId,
        topics_json: JSON.stringify(topics),
        entities_json: JSON.stringify(entities),
        quality_score: qualityScore,
        dedupe_key: dedupeKey,
      },
    });

    annotationCount++;
  }

  console.log(`   ✓ ${annotationCount} annotations created.\n`);

  // ── 7. Interest signals (15+) ─────────────────────────────────────────
  console.log("7. Creating interest signals...");

  const signalTemplates = [
    { type: "x_follows", provider: "x", raw: "@elonmusk", topic: "Space & Aerospace", entity: "SpaceX" },
    { type: "x_follows", provider: "x", raw: "@AndrewYNg", topic: "AI & Machine Learning", entity: "DeepLearning.AI" },
    { type: "x_follows", provider: "x", raw: "@sundarpichai", topic: "Big Tech", entity: "Google" },
    { type: "x_follows", provider: "x", raw: "@elonmusk", topic: "AI & Machine Learning", entity: "xAI" },
    { type: "x_like_bookmark", provider: "x", raw: "liked: post about OpenAI GPT-5", topic: "AI & Machine Learning", entity: "OpenAI" },
    { type: "x_like_bookmark", provider: "x", raw: "bookmarked: cybersecurity thread", topic: "Cybersecurity & Privacy", entity: "CrowdStrike" },
    { type: "x_like_bookmark", provider: "x", raw: "liked: Tesla Optimus demo", topic: "Robotics & Automation", entity: "Tesla" },
    { type: "x_like_bookmark", provider: "x", raw: "bookmarked: NVIDIA earnings article", topic: "Markets & Finance", entity: "NVIDIA" },
    { type: "google_profile_org", provider: "google", raw: "profile: works at tech startup", topic: "Startups & Venture Capital", entity: "YC" },
    { type: "google_profile_org", provider: "google", raw: "profile: interested in AI safety", topic: "AI & Machine Learning", entity: "Anthropic" },
    { type: "google_profile_org", provider: "google", raw: "profile: open source contributor", topic: "Open Source", entity: "GitHub" },
    { type: "google_profile_org", provider: "google", raw: "profile: climate tech advocate", topic: "Climate & Energy Tech", entity: "Tesla" },
    { type: "x_follows", provider: "x", raw: "@rustlang", topic: "Software Engineering", entity: "Rust" },
    { type: "x_like_bookmark", provider: "x", raw: "liked: quantum computing paper", topic: "Science & Research", entity: "MIT" },
    { type: "google_profile_org", provider: "google", raw: "profile: semiconductor industry", topic: "Semiconductors & Hardware", entity: "TSMC" },
    { type: "x_follows", provider: "x", raw: "@naval", topic: "Startups & Venture Capital", entity: "a16z" },
    { type: "x_like_bookmark", provider: "x", raw: "bookmarked: AR/VR trends article", topic: "Consumer Tech", entity: "Apple" },
  ];

  for (const sig of signalTemplates) {
    await prisma.interest_signals.create({
      data: {
        user_id: TEST_USER_ID,
        provider: sig.provider,
        signal_type: sig.type,
        raw_value: sig.raw,
        normalized_topic: sig.topic,
        entity: sig.entity,
        weight: Math.round(Math.random() * 0.6 + 0.6 * 100) / 100,
        confidence: Math.round(Math.random() * 0.4 + 0.6 * 100) / 100,
        observed_at: randomDate(720),
        signal_strength_bucket: randomInt(0, 3),
      },
    });
    console.log(`   ✓ ${sig.type}: ${sig.raw.substring(0, 40)} → ${sig.topic}`);
  }
  console.log(`   ✓ ${signalTemplates.length} interest signals created.\n`);

  // ── 8. Linked account (X) ─────────────────────────────────────────────
  console.log("8. Creating linked account (X)...");
  const linkedAccount = await prisma.linked_accounts.create({
    data: {
      user_id: TEST_USER_ID,
      provider: "x",
      status: "active",
      access_token_encrypted: "ct:v1:eyJhbGciOiJBMjU2R0NNIiwidHlwZSI6IkpXVCJ9.enc_k2x9f8m3n7b5z1q4w0r...a8k3m5n",
      refresh_token_encrypted: "ct:v1:eyJhbGciOiJBMjU2R0NNIn0.refresh_t0k3n_enc...x9y2",
      scopes_json: JSON.stringify(["read", "write", "profile", "followers"]),
      last_sync_at: now,
      expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`   ✓ Linked account: provider=${linkedAccount.provider}, status=${linkedAccount.status}\n`);

  // ── 9. Daily brief for TODAY ──────────────────────────────────────────
  console.log("9. Creating daily brief for today...");
  const todayBrief = await prisma.daily_briefs.create({
    data: {
      user_id: TEST_USER_ID,
      brief_date: today,
      status: "completed",
      generated_at: now,
      generation_duration_ms: 3245,
      candidate_count: totalArticleCount,
    },
  });
  console.log(`   ✓ Brief #${todayBrief.id} for ${today.toISOString().split("T")[0]} (${todayBrief.candidate_count} candidates)\n`);

  // ── 10. Today's brief items (5) ──────────────────────────────────────
  console.log("10. Creating 5 brief items for today's brief...");

  const todaySummaries = [
    {
      summary: "OpenAI is reportedly closing a massive $40 billion funding round that would value the company at approximately $300 billion. The investment, led by major institutional investors, signals continued confidence in the rapidly growing AI sector despite broader market volatility.",
      why: "You follow AI & Machine Learning topics and interacted with @OpenAI on X.",
    },
    {
      summary: "The EU has begun enforcing its landmark AI Act, issuing the first fines to companies operating non-compliant foundation models. The regulatory action marks a pivotal moment in global AI governance and sets a precedent that other jurisdictions are closely watching.",
      why: "Matching your interest in Regulatory & Policy and Big Tech topics.",
    },
    {
      summary: "NVIDIA reported record-breaking quarterly revenue of $30 billion from data center operations, driven by unprecedented demand for AI accelerator chips. The company's stock surged 8% in after-hours trading as the results exceeded even optimistic analyst estimates.",
      why: "You follow NVIDIA and have signals in Markets & Finance.",
    },
    {
      summary: "SpaceX successfully completed the first orbital refueling demonstration using its Starship vehicle, a critical capability for future deep-space missions including NASA's Artemis program. The test marks a major milestone in the company's ambitious Mars colonization plans.",
      why: "You follow @elonmusk and Space & Aerospace topics.",
    },
    {
      summary: "Figure AI released a compelling demo of its humanoid robot autonomously performing kitchen cleanup tasks, including identifying objects, using cleaning tools, and navigating cluttered environments. The demonstration represents one of the most impressive displays of general-purpose robot capability to date.",
      why: "Your X bookmarks include robotics content and you follow robotics companies.",
    },
  ];

  // Pick 5 distinct articles from the seeded pool
  const topArticles = pickRandom(
    allArticles.slice(0, 30), // pick from first batch for realism
    5,
  );

  const scores = [0.85, 0.72, 0.65, 0.58, 0.51];
  for (let i = 0; i < 5; i++) {
    await prisma.daily_brief_items.create({
      data: {
        daily_brief_id: todayBrief.id,
        article_id: topArticles[i].id,
        rank: i + 1,
        score: scores[i],
        summary: todaySummaries[i].summary,
        why_recommended: todaySummaries[i].why,
      },
    });
    console.log(`   ✓ Item #${i + 1}: rank ${i + 1}, score ${scores[i]}, article ${topArticles[i].title.substring(0, 50)}...`);
  }
  console.log("");

  // ── 11. Daily brief for YESTERDAY ─────────────────────────────────────
  console.log("11. Creating daily brief for yesterday...");
  const yesterdayBrief = await prisma.daily_briefs.create({
    data: {
      user_id: TEST_USER_ID,
      brief_date: yesterday,
      status: "completed",
      generated_at: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000),
      generation_duration_ms: 2890,
      candidate_count: 195,
    },
  });
  console.log(`   ✓ Brief #${yesterdayBrief.id} for ${yesterday.toISOString().split("T")[0]} (${yesterdayBrief.candidate_count} candidates)\n`);

  const yesterdaySummaries = [
    {
      summary: "Meta AI released Llama 4 with a massive 405B parameter model, claiming state-of-the-art open-source performance across all major benchmarks. The release represents a significant leap in the open-source AI competition with implications for enterprise adoption.",
      why: "You follow AI & Machine Learning and Meta AI on X.",
    },
    {
      summary: "Anthropic launched Claude 4 with groundbreaking multi-modal reasoning capabilities and native code execution. Early benchmarks show competitive performance against leading proprietary models in coding and scientific reasoning tasks.",
      why: "Your X bookmarks include Anthropic content and AI safety topics.",
    },
    {
      summary: "TSMC began risk production of its next-generation 2nm semiconductor process, promising a 25% performance improvement over current 3nm nodes. The milestone positions the foundry leader ahead of competitors in the race for advanced chip manufacturing.",
      why: "You follow the Semiconductors & Hardware topic.",
    },
    {
      summary: "DeepMind's AlphaFold update now covers over 200 million predicted protein structures, essentially cataloging nearly every known protein. This comprehensive database is expected to accelerate drug discovery and biological research worldwide.",
      why: "Matching your interest in Science & Research and Biotech topics.",
    },
    {
      summary: "BlackRock's spot Bitcoin ETF surpassed $100 billion in assets under management, marking a watershed moment for cryptocurrency's integration into mainstream finance. The milestone reflects growing institutional adoption of digital assets.",
      why: "Your interest signals include Markets & Finance and crypto topics.",
    },
  ];

  const yesterArticles = pickRandom(allArticles.slice(0, 30), 5);
  for (let i = 0; i < 5; i++) {
    await prisma.daily_brief_items.create({
      data: {
        daily_brief_id: yesterdayBrief.id,
        article_id: yesterArticles[i].id,
        rank: i + 1,
        score: scores[i] - 0.05,
        summary: yesterdaySummaries[i].summary,
        why_recommended: yesterdaySummaries[i].why,
      },
    });
    console.log(`   ✓ Item #${i + 1}: rank ${i + 1}, article ${yesterArticles[i].title.substring(0, 50)}...`);
  }
  console.log("");

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("✅ Seed complete! Summary:");
  console.log(`   Users:        1`);
  console.log(`   Profiles:     1`);
  console.log(`   Topic prefs:  ${preferredTopics.length}`);
  console.log(`   Articles:     ${totalArticleCount} (unique: ${uniqueCount}, dups: ${dupArticles.length})`);
  console.log(`   Annotations:  ${annotationCount}`);
  console.log(`   Signals:      ${signalTemplates.length}`);
  console.log(`   Linked accs:  1`);
  console.log(`   Briefs:       2`);
  console.log(`   Brief items:  10`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
