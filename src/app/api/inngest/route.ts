import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import {
  ingestArticles,
  annotateArticles,
  generateDailyBrief,
  generateAllDailyBriefs,
  batchAnnotateArticles,
  scheduleIngressAnnotations,
  syncXSignals,
  syncGoogleSignals,
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
    scheduleIngressAnnotations,
    syncXSignals,
    syncGoogleSignals,
  ],
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
