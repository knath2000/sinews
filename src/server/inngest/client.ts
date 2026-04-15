import { Inngest } from "inngest";

// Inngest client - used to define functions, send events, and create the serve handler
export const inngest = new Inngest({
  id: "ai-news-digest",
});

// Event types
export const Events = {
  articleInserted: {
    name: "article.inserted",
    data: {} as { article_id: number },
  },
  dailyBriefTriggered: {
    name: "daily-brief.triggered",
    data: {} as { user_id: string },
  },
} as const;
