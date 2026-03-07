import { describe, expect, it } from "vitest";
import {
  buildEpisodicContextBlock,
  buildEpisodeSummaryPrompt,
  episodeDateString,
  extractKeyTopics,
  resolveEpisodicConfig,
  type Episode,
  type EpisodeSummary,
} from "./episodic-memory.js";

// ---------------------------------------------------------------------------
// resolveEpisodicConfig
// ---------------------------------------------------------------------------

describe("resolveEpisodicConfig", () => {
  it("returns enabled=true by default", () => {
    expect(resolveEpisodicConfig().enabled).toBe(true);
  });

  it("returns retentionDays=30 by default", () => {
    expect(resolveEpisodicConfig().retentionDays).toBe(30);
  });

  it("returns summaryRetentionDays=365 by default", () => {
    expect(resolveEpisodicConfig().summaryRetentionDays).toBe(365);
  });

  it("respects custom retentionDays", () => {
    expect(resolveEpisodicConfig({ retentionDays: 7 }).retentionDays).toBe(7);
  });

  it("respects enabled=false", () => {
    expect(resolveEpisodicConfig({ enabled: false }).enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// episodeDateString
// ---------------------------------------------------------------------------

describe("episodeDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = episodeDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns correct date for a specific date", () => {
    const date = new Date(2026, 2, 7); // March 7, 2026 in local time
    const result = episodeDateString(date);
    expect(result).toBe("2026-03-07");
  });

  it("zero-pads month and day", () => {
    const date = new Date(2026, 0, 5); // Jan 5
    const result = episodeDateString(date);
    expect(result).toBe("2026-01-05");
  });
});

// ---------------------------------------------------------------------------
// extractKeyTopics
// ---------------------------------------------------------------------------

describe("extractKeyTopics", () => {
  it("returns empty array for no entries", () => {
    expect(extractKeyTopics([])).toEqual([]);
  });

  it("extracts recurring words as topics", () => {
    const entries = [
      {
        timestamp: "",
        type: "message" as const,
        content: "memory system memory system",
      },
      {
        timestamp: "",
        type: "message" as const,
        content: "implement memory test",
      },
    ];
    const topics = extractKeyTopics(entries);
    expect(topics).toContain("memory");
  });

  it("excludes stop words", () => {
    const entries = [
      {
        timestamp: "",
        type: "message" as const,
        content: "the code runs code runs",
      },
    ];
    const topics = extractKeyTopics(entries);
    expect(topics).not.toContain("the");
  });

  it("returns at most 8 topics", () => {
    const content = Array.from({ length: 20 }, (_, i) => `topic${i} topic${i}`).join(" ");
    const entries = [{ timestamp: "", type: "message" as const, content }];
    expect(extractKeyTopics(entries).length).toBeLessThanOrEqual(8);
  });

  it("requires word length >= 4", () => {
    const entries = [{ timestamp: "", type: "message" as const, content: "api api api api" }];
    // "api" is 3 chars — should be excluded
    const topics = extractKeyTopics(entries);
    expect(topics).not.toContain("api");
  });
});

// ---------------------------------------------------------------------------
// buildEpisodeSummaryPrompt
// ---------------------------------------------------------------------------

describe("buildEpisodeSummaryPrompt", () => {
  const episode: Episode = {
    date: "2026-03-07",
    entries: [
      {
        timestamp: "2026-03-07T10:00:00Z",
        type: "session_start",
        content: "Session started",
      },
      {
        timestamp: "2026-03-07T10:05:00Z",
        type: "message",
        content: "Implemented memory system",
      },
    ],
  };

  it("includes the episode date", () => {
    const prompt = buildEpisodeSummaryPrompt(episode, "pt");
    expect(prompt).toContain("2026-03-07");
  });

  it("returns Portuguese prompt by default", () => {
    const prompt = buildEpisodeSummaryPrompt(episode);
    expect(prompt).toMatch(/resumo|episódio/i);
  });

  it("returns English prompt when language=en", () => {
    const prompt = buildEpisodeSummaryPrompt(episode, "en");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("Summary:");
  });

  it("includes entry content", () => {
    const prompt = buildEpisodeSummaryPrompt(episode, "en");
    expect(prompt).toContain("Session started");
  });

  it("caps entries at 50 lines", () => {
    const bigEpisode: Episode = {
      date: "2026-03-07",
      entries: Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        type: "message" as const,
        content: `Message ${i}`,
      })),
    };
    const prompt = buildEpisodeSummaryPrompt(bigEpisode, "en");
    // Should not include Message 50+ (entries are capped at 50)
    expect(prompt).not.toContain("Message 99");
  });
});

// ---------------------------------------------------------------------------
// buildEpisodicContextBlock
// ---------------------------------------------------------------------------

describe("buildEpisodicContextBlock", () => {
  it("returns empty string when both summaries are null", () => {
    expect(buildEpisodicContextBlock(null, null)).toBe("");
  });

  it("uses today's summary when available", () => {
    const today: EpisodeSummary = {
      date: "2026-03-07",
      summary: "Worked on memory system",
      keyTopics: ["memory", "typescript"],
      createdAt: new Date().toISOString(),
    };
    const block = buildEpisodicContextBlock(today, null);
    expect(block).toContain("memory system");
  });

  it("falls back to yesterday's summary", () => {
    const yesterday: EpisodeSummary = {
      date: "2026-03-06",
      summary: "Deployed new feature",
      keyTopics: ["deploy"],
      createdAt: new Date().toISOString(),
    };
    const block = buildEpisodicContextBlock(null, yesterday);
    expect(block).toContain("Deployed new feature");
  });

  it("prefers today's summary over yesterday's", () => {
    const today: EpisodeSummary = {
      date: "2026-03-07",
      summary: "Today work",
      keyTopics: [],
      createdAt: new Date().toISOString(),
    };
    const yesterday: EpisodeSummary = {
      date: "2026-03-06",
      summary: "Yesterday work",
      keyTopics: [],
      createdAt: new Date().toISOString(),
    };
    const block = buildEpisodicContextBlock(today, yesterday);
    expect(block).toContain("Today work");
    expect(block).not.toContain("Yesterday work");
  });

  it("includes key topics when present", () => {
    const summary: EpisodeSummary = {
      date: "2026-03-07",
      summary: "Summary text",
      keyTopics: ["memory", "tests"],
      createdAt: new Date().toISOString(),
    };
    const block = buildEpisodicContextBlock(summary, null);
    expect(block).toContain("memory");
    expect(block).toContain("tests");
  });

  it("starts with ## Recent Context header", () => {
    const summary: EpisodeSummary = {
      date: "2026-03-07",
      summary: "x",
      keyTopics: [],
      createdAt: new Date().toISOString(),
    };
    const block = buildEpisodicContextBlock(summary, null);
    expect(block).toMatch(/^## Recent Context/);
  });
});
