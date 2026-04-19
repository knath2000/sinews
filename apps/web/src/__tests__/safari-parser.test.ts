import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { parseSafariHistoryZip } from "../server/history-import/safari-parser";

function makeVisit(url: string, daysAgo: number, title = "", baseMs = Date.now()): Record<string, unknown> {
  const timestamp = baseMs - daysAgo * 24 * 60 * 60 * 1_000;
  return {
    url,
    title,
    time_usec: timestamp * 1_000,
    visit_count: 1,
  };
}

function createZipBuffer(entries: Array<{ name: string; content: string }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    for (const entry of entries) {
      archive.append(entry.content, { name: entry.name });
    }
    archive.finalize();
  });
}

function createTestZip(historyData: Record<string, unknown>[], schemaVersion: unknown): Promise<Buffer> {
  return createZipBuffer([
    {
      name: "History.json",
      content: JSON.stringify(
        {
          metadata: {
            schema_version: schemaVersion,
            browser_name: "Safari",
            browser_version: "18.0",
            data_type: "history",
          },
          history: historyData,
        },
        null,
        2
      ),
    },
  ]);
}

describe("parseSafariHistoryZip", () => {
  it("returns counts for a valid Safari ZIP", async () => {
    const base = Date.now();
    const buffer = await createTestZip(
      [
        makeVisit("https://techcrunch.com/2026/04/14/startup-a", 1, "Startup funding update", base),
        makeVisit("https://news.ycombinator.com/item?id=1", 0, "Open source API launch", base),
        makeVisit("https://openai.com/research/gpt-5", 0, "GPT-5 launch", base),
      ],
      1
    );

    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-valid");

    expect(result.schemaVersion).toBe(1);
    expect(result.totalVisits).toBe(3);
    expect(result.acceptedVisits).toBe(3);
    expect(result.rejectedVisits).toBe(0);
    expect(result.topDomains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ domain: "techcrunch.com", count: 1 }),
        expect.objectContaining({ domain: "news.ycombinator.com", count: 1 }),
        expect.objectContaining({ domain: "openai.com", count: 1 }),
      ])
    );
    expect(result.topicCounts).toMatchObject({
      startups_venture: 2,
      consumer_tech: 1,
      developer_tools: 1,
      artificial_intelligence: 1,
    });
    expect(result.dateRange).toEqual({
      start: new Date(base - 1 * 24 * 60 * 60 * 1_000).toISOString(),
      end: new Date(base).toISOString(),
    });
    expect(JSON.stringify(result)).not.toContain("https://");
    expect(JSON.stringify(result)).not.toContain("http://");
  });

  it("throws when History.json is missing", async () => {
    const buffer = await createZipBuffer([{ name: "readme.txt", content: "not history" }]);

    await expect(parseSafariHistoryZip(Readable.from(buffer), "import-missing")).rejects.toThrow(
      "History.json not found in archive"
    );
  });

  it("throws on unknown schema_version with schemaVersion attached", async () => {
    const base = Date.now();
    const buffer = await createTestZip([makeVisit("https://techcrunch.com/article", 0, "", base)], 2);

    await expect(parseSafariHistoryZip(Readable.from(buffer), "import-schema")).rejects.toMatchObject({
      message: expect.stringContaining("Unknown schema version"),
      schemaVersion: 2,
    });
  });

  it("rejects duplicate visits on the same URL and day", async () => {
    const base = Date.now();
    const buffer = await createTestZip(
      [
        makeVisit("https://news.ycombinator.com/item?id=1", 0, "Open source", base),
        makeVisit("https://news.ycombinator.com/item?id=1", 0, "Open source again", base),
        makeVisit("https://openai.com/research/gpt-5", 0, "GPT-5 launch", base),
      ],
      1
    );

    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-dupe");
    expect(result.totalVisits).toBe(3);
    expect(result.acceptedVisits).toBe(2);
    expect(result.rejectedVisits).toBe(1);
  });

  it("rejects visits older than 90 days", async () => {
    const base = Date.now();
    const buffer = await createTestZip(
      [makeVisit("https://techcrunch.com/old", 91, "Old article", base), makeVisit("https://openai.com/new", 0, "Fresh article", base)],
      1
    );

    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-old");
    expect(result.totalVisits).toBe(2);
    expect(result.acceptedVisits).toBe(1);
    expect(result.rejectedVisits).toBe(1);
  });

  it("rejects non-http and localhost URLs", async () => {
    const base = Date.now();
    const buffer = await createTestZip(
      [
        makeVisit("ftp://example.com/file", 0, "FTP link", base),
        makeVisit("http://localhost:3000/dashboard", 0, "Localhost", base),
        makeVisit("https://openai.com/blog", 0, "Valid", base),
      ],
      1
    );

    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-hosts");
    expect(result.totalVisits).toBe(3);
    expect(result.acceptedVisits).toBe(1);
    expect(result.rejectedVisits).toBe(2);
  });

  it("only exposes aggregated data in the parsed result", async () => {
    const base = Date.now();
    const buffer = await createTestZip([makeVisit("https://techcrunch.com/article", 0, "Startup news", base)], 1);
    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-preview");

    expect(result.topDomains).toEqual([{ domain: "techcrunch.com", count: 1 }]);
    expect(result.stagedSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ raw_value: "techcrunch.com" }),
      ])
    );
    expect(result.stagedSignals[0]?.raw_value).toBe("techcrunch.com");
    expect(JSON.stringify(result.topDomains)).not.toContain("https://");
    expect(JSON.stringify(result.stagedSignals)).not.toContain("https://");
  });

  it("caps per-domain total weight at 0.5 across all topics", async () => {
    const base = Date.now();
    // 200 distinct URLs on techcrunch.com with varied keywords to trigger
    // many topic inferences — raw weight will be well above 0.5
    const entries: Record<string, unknown>[] = [];
    const keywordSets = [
      "startup funding series A venture capital",
      "artificial intelligence AI model gpt llm generative",
      "cloud serverless kubernetes edge computing",
    ];
    for (let i = 0; i < 200; i++) {
      entries.push(
        makeVisit(
          `https://techcrunch.com/article/${i}`,
          0,
          keywordSets[i % keywordSets.length],
          base
        )
      );
    }
    const buffer = await createTestZip(entries, 1);
    const result = await parseSafariHistoryZip(Readable.from(buffer), "import-cap-test");

    // Sum all signal weights for techcrunch.com across every topic
    const domainTotal = result.stagedSignals
      .filter((s) => s.raw_value === "techcrunch.com")
      .reduce((sum, s) => sum + s.weight, 0);

    // Domain total must not exceed 0.5 regardless of visit count
    expect(domainTotal).toBeLessThanOrEqual(0.501);
    // Should still have multiple topic signals (not collapsed to one)
    const tcSignals = result.stagedSignals.filter(
      (s) => s.raw_value === "techcrunch.com"
    );
    expect(tcSignals.length).toBeGreaterThan(1);
  });
});
