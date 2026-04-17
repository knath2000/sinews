import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeedPage from "@/app/feed/page";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/feed",
}));

vi.mock("@/lib/theme-provider", () => ({
  useTheme: () => ({
    isDark: false,
    toggleDark: vi.fn(),
    loading: false,
  }),
}));

const feedPayload = {
  articles: [
    {
      id: 1,
      title: "Compact story title for the briefing layout",
      source_name: "The Verge",
      canonical_url: "https://example.com/story",
      image_url: null,
      published_at: "2026-04-17T08:30:00.000Z",
      summary:
        "This summary should remain visible above the fold and avoid becoming a giant hero treatment.",
      why_recommended:
        "Matched your developer tools and AI interests without taking over the entire screen.",
      matched_signals: ["artificial_intelligence", "developer_tools"],
      provenance: {
        matched_topics: ["artificial_intelligence", "developer_tools"],
        matched_entities: ["OpenAI"],
        safari_history_import: {
          contributed: true,
          top_topics: [
            { topic: "developer_tools", weight: 1.23 },
            { topic: "artificial_intelligence", weight: 0.81 },
          ],
          top_domains: [
            { domain: "github.com", weight: 0.92 },
            { domain: "console.cloud.google.com", weight: 0.64 },
          ],
        },
      },
      rank: 1,
      score: 0.91,
      brief_item_id: 101,
    },
  ],
  generatedAt: "2026-04-17T11:22:00.000Z",
};

describe("FeedPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith("/api/settings/consent")) {
          return {
            ok: true,
            json: async () => ({ isCurrent: true }),
          } as Response;
        }

        if (url.endsWith("/api/feed")) {
          return {
            ok: true,
            json: async () => feedPayload,
          } as Response;
        }

        if (url.endsWith("/api/me")) {
          return {
            ok: true,
            json: async () => ({
              user: { email: "kalyan@example.com" },
              profile: { displayName: "Kalyan" },
            }),
          } as Response;
        }

        if (url.endsWith("/api/settings/topics")) {
          return {
            ok: true,
            json: async () => ({
              preferences: [
                { topic: "artificial_intelligence", weight: 1 },
                { topic: "developer_tools", weight: 1 },
              ],
            }),
          } as Response;
        }

        if (url.endsWith("/api/feed/personalization")) {
          return {
            ok: true,
            json: async () => ({
              personalization: {
                topicsCovered: 1,
                totalActiveTopics: 2,
                activeSignals: 2,
                articlesReadToday: 0,
                recentReading: [],
              },
            }),
          } as Response;
        }

        throw new Error(`Unhandled fetch: ${url}`);
      })
    );

  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a compact article card with fallback art when the image is missing", async () => {
    render(<FeedPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Compact story title for the briefing layout")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "This summary should remain visible above the fold and avoid becoming a giant hero treatment."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Influenced by Safari history: developer tools and artificial intelligence")
    ).toBeInTheDocument();

    const fallbackImage = screen.getByTestId("article-image-fallback");
    expect(fallbackImage).toBeInTheDocument();
    expect(fallbackImage.className).toContain("h-[190px]");
    expect(screen.queryByTestId("article-image")).not.toBeInTheDocument();
  });
});
