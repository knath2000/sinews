import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  db: {
    daily_briefs: {
      findFirst: vi.fn(),
    },
    user_topic_preferences: {
      count: vi.fn(),
    },
    interest_signals: {
      count: vi.fn(),
    },
    feedback_events: {
      count: vi.fn(),
    },
    linked_accounts: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/auth-server", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/server/db/client", () => ({
  db: mocks.db,
}));

import { GET } from "@/app/api/feed/personalization/route";

describe("/api/feed/personalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAuth.mockResolvedValue({
      dbUser: { id: "user-1" },
    });
    mocks.db.daily_briefs.findFirst.mockResolvedValue(null);
    mocks.db.user_topic_preferences.count.mockResolvedValue(4);
    mocks.db.interest_signals.count.mockResolvedValue(7);
    mocks.db.feedback_events.count.mockResolvedValue(0);
    mocks.db.$queryRaw.mockResolvedValue([]);
  });

  it("counts active interest_signals for the sidebar metric", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.personalization.activeSignals).toBe(7);
    expect(mocks.db.interest_signals.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user_id: "user-1",
          OR: [
            { expires_at: null },
            { expires_at: { gte: expect.any(Date) } },
          ],
        }),
      })
    );
  });
});
