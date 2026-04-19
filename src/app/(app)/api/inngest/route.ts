import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import {
  ingestArticles,
  annotateArticles,
  generateDailyBrief,
  generateAllDailyBriefs,
  batchAnnotateArticles,
  generateAllUserBriefs,
  syncXSignals,
  syncGoogleSignals,
  syncPrecomputeBriefs,
} from "@/server/inngest";

export const dynamic = "force-dynamic";

const handler = serve({
  client: inngest,
  functions: [
    ingestArticles,
    annotateArticles,
    batchAnnotateArticles,
    generateDailyBrief,
    generateAllDailyBriefs,
    generateAllUserBriefs,
    syncXSignals,
    syncGoogleSignals,
    syncPrecomputeBriefs,
  ],
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
