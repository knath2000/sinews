import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";

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

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme toggle</button>,
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith("/api/settings/accounts")) {
          return {
            ok: true,
            json: async () => ({
              accounts: [
                {
                  provider: "google",
                  status: "active",
                  expires_at: null,
                  last_sync_at: "2026-04-17T11:22:00.000Z",
                },
              ],
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

        if (url.endsWith("/api/settings/brief-hour")) {
          return {
            ok: true,
            json: async () => ({ hour: 4 }),
          } as Response;
        }

        if (url.endsWith("/api/history-imports")) {
          return {
            ok: true,
            json: async () => ({
              import: {
                id: "safari-import-1",
                status: "confirmed",
                preview_json: null,
                confirmed_at: "2026-04-17T11:22:00.000Z",
                summary: {
                  acceptedCount: 3734,
                  topTopics: [
                    { topic: "developer_tools", count: 30 },
                    { topic: "cloud_computing", count: 17 },
                    { topic: "artificial_intelligence", count: 21 },
                  ],
                  topDomains: [
                    { domain: "github.com", count: 14 },
                    { domain: "console.cloud.google.com", count: 10 },
                    { domain: "reddit.com", count: 8 },
                  ],
                  behaviorBlurb:
                    "Your Safari activity leans toward developer tools, cloud computing, and artificial intelligence.",
                },
              },
            }),
          } as Response;
        }

        if (url.endsWith("/api/settings/profile")) {
          return {
            ok: true,
            json: async () => ({
              displayName: "Kalyan",
              timezone: "America/Los_Angeles",
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the feed-style settings shell with settings active", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Control your briefing, connections, and privacy.")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("AI News Digest")).toBeInTheDocument();
    expect(screen.getByText("Settings hub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getAllByText("Theme toggle")).toHaveLength(2);
    expect(screen.getByText("Safari History Import")).toBeInTheDocument();
    expect(screen.getByText("History imported successfully")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your Safari activity leans toward developer tools, cloud computing, and artificial intelligence."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("3,734 accepted visits")).toBeInTheDocument();
    expect(screen.getByText("github.com")).toBeInTheDocument();
  });
});
