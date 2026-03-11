import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all filesystem-dependent soul modules before importing engine
vi.mock("./soul-profile.js", () => {
  const defaultProfile = {
    lastUpdated: Date.now(),
    psychometrics: null,
    currentState: {
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      dominantPattern: "none",
    },
    relationships: { healthy: [], needsAttention: [], avoided: [] },
    dreams: { active: [], dormant: [], achieved: [] },
    rhythms: { peakHours: [], peakDays: [], currentCycle: "normal" },
    patterns: { procrastinating: [], avoiding: ["exercício"], strengths: [] },
    milestones: { upcoming: [], recent: [], streaks: [] },
    growthPlan: null,
    financePattern: "mixed",
    soulSummary: "Perfil de teste.",
  };
  return {
    ensureSoulDir: vi.fn().mockResolvedValue(undefined),
    loadSoulProfile: vi.fn().mockResolvedValue(structuredClone(defaultProfile)),
    saveSoulProfile: vi.fn().mockResolvedValue(undefined),
    appendObservation: vi.fn().mockResolvedValue(undefined),
    buildSoulContext: vi.fn().mockReturnValue({
      energy: "medium",
      mood: "neutral",
      stressLevel: 3,
      activePattern: null,
      recentDream: null,
      relationshipAlert: null,
      adaptationHint: "Tom equilibrado. Adapte conforme a conversa evolui.",
    }),
  };
});

vi.mock("./productivity-map.js", () => ({
  loadRhythms: vi.fn().mockResolvedValue({
    hourly: [],
    daily: [],
    peakHours: [],
    peakDays: [],
    currentCycle: "normal",
    cycleStartDate: 0,
    dataPoints: 0,
    lastUpdated: 0,
  }),
  saveRhythms: vi.fn().mockResolvedValue(undefined),
  recordDataPoint: vi.fn().mockImplementation((rhythms) => rhythms),
  generateProductivityMap: vi.fn().mockReturnValue("Dados insuficientes."),
}));

vi.mock("./relational-memory.js", () => ({
  extractPeople: vi.fn().mockReturnValue([]),
  updateRelationship: vi.fn().mockImplementation((map) => map),
  loadRelationships: vi.fn().mockResolvedValue({ people: [], lastUpdated: 0 }),
  saveRelationships: vi.fn().mockResolvedValue(undefined),
  detectSentiment: vi.fn().mockReturnValue("neutral"),
  getRelationshipAlerts: vi.fn().mockReturnValue([]),
  formatRelationshipReport: vi.fn().mockReturnValue("Sem dados de relacionamentos."),
}));

vi.mock("./dream-vault.js", () => ({
  detectDream: vi.fn().mockReturnValue(null),
  loadDreams: vi.fn().mockResolvedValue({ dreams: [], lastUpdated: 0 }),
  saveDreams: vi.fn().mockResolvedValue(undefined),
  addDream: vi.fn().mockImplementation((vault) => vault),
  getDreamReminders: vi.fn().mockReturnValue([]),
  formatDreamReport: vi.fn().mockReturnValue("Nenhum sonho registrado."),
}));

vi.mock("./shadow-finance.js", () => ({
  analyzeFinanceSignals: vi.fn().mockReturnValue(null),
  loadFinanceProfile: vi.fn().mockResolvedValue({
    dominantPattern: "mixed",
    anxietySignals: 0,
    abundanceSignals: 0,
    avoidanceSignals: 0,
    examples: [],
    lastUpdated: 0,
  }),
  saveFinanceProfile: vi.fn().mockResolvedValue(undefined),
  updateFinanceProfile: vi.fn().mockImplementation((profile) => profile),
  generateFinanceReport: vi.fn().mockReturnValue("Sem dados financeiros."),
}));

vi.mock("./celebration.js", () => ({
  detectWin: vi.fn().mockReturnValue(null),
  loadCelebrations: vi.fn().mockResolvedValue({
    streaks: [],
    milestones: [],
    recentWins: [],
    lastUpdated: 0,
  }),
  saveCelebrations: vi.fn().mockResolvedValue(undefined),
  recordWin: vi.fn().mockImplementation((data) => data),
  formatCelebrationReport: vi.fn().mockReturnValue(null),
}));

vi.mock("./psychometrics.js", () => ({
  generatePsychometricReport: vi.fn().mockReturnValue("Perfil psicométrico."),
  loadPsychometricProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("./growth-curator.js", () => ({
  generateRecommendations: vi.fn().mockReturnValue({
    book: null,
    mentor: null,
    framework: null,
    content: null,
    generatedAt: Date.now(),
  }),
  formatGrowthPlan: vi.fn().mockReturnValue("Plano de crescimento."),
}));

import {
  processMessage,
  getSoulContext,
  handleSoulCommand,
  getMorningBriefSoul,
} from "./engine.js";

describe("processMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a snapshot and context for any message", async () => {
    const result = await processMessage("olá, bom dia");
    expect(result).toHaveProperty("snapshot");
    expect(result).toHaveProperty("context");
    expect(result.snapshot.energy).toBeDefined();
    expect(result.snapshot.mood).toBeDefined();
    expect(result.context.adaptationHint).toBeDefined();
  });

  it("never throws — returns fallback on error", async () => {
    // Force ensureSoulDir to throw
    const { ensureSoulDir } = await import("./soul-profile.js");
    vi.mocked(ensureSoulDir).mockRejectedValueOnce(new Error("disk full"));

    const result = await processMessage("test");
    expect(result.snapshot.energy).toBe("medium");
    expect(result.context.mood).toBe("neutral");
  });

  it("detects energy and mood from message content", async () => {
    const result = await processMessage("estou exausto, dormi mal");
    expect(result.snapshot.energy).toBe("depleted");
  });

  it("truncates long message excerpts for observations", async () => {
    const { appendObservation } = await import("./soul-profile.js");
    const longMsg = "a".repeat(200);
    await processMessage(longMsg);
    const call = vi.mocked(appendObservation).mock.calls[0];
    expect(call?.[0].messageExcerpt.length).toBeLessThanOrEqual(100);
  });
});

describe("getSoulContext", () => {
  it("returns a SoulContext without processing a message", async () => {
    const ctx = await getSoulContext();
    expect(ctx.energy).toBeDefined();
    expect(ctx.mood).toBeDefined();
    expect(ctx.adaptationHint).toBeDefined();
  });
});

describe("handleSoulCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles 'me analisa' command", async () => {
    const result = await handleSoulCommand("me analisa");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles 'como estou' command", async () => {
    const result = await handleSoulCommand("como estou");
    expect(result).toContain("Energia");
  });

  it("handles 'meus sonhos' command", async () => {
    const result = await handleSoulCommand("meus sonhos");
    expect(typeof result).toBe("string");
  });

  it("handles 'minha produtividade' command", async () => {
    const result = await handleSoulCommand("minha produtividade");
    expect(typeof result).toBe("string");
  });

  it("handles 'minhas relacoes' command", async () => {
    const result = await handleSoulCommand("minhas relacoes");
    expect(typeof result).toBe("string");
  });

  it("handles 'padrao financeiro' command", async () => {
    const result = await handleSoulCommand("padrao financeiro");
    expect(typeof result).toBe("string");
  });

  it("handles 'minhas vitorias' command", async () => {
    const result = await handleSoulCommand("minhas vitorias");
    expect(typeof result).toBe("string");
  });

  it("handles 'o que estou evitando' command", async () => {
    const result = await handleSoulCommand("o que estou evitando");
    expect(result).toContain("evitando");
  });

  it("handles 'o que devo ler' command", async () => {
    const result = await handleSoulCommand("o que devo ler");
    expect(typeof result).toBe("string");
  });

  it("returns help for unknown soul commands", async () => {
    const result = await handleSoulCommand("comando inexistente");
    expect(result).toContain("nao reconhecido");
  });

  it("handles 'apaga meu perfil soul' with confirmation request", async () => {
    const result = await handleSoulCommand("apaga meu perfil soul");
    expect(result).toContain("certeza");
  });
});

describe("getMorningBriefSoul", () => {
  it("returns a string with soul section or null", async () => {
    const result = await getMorningBriefSoul();
    // May return null if profile is default/neutral
    expect(result === null || typeof result === "string").toBe(true);
  });
});
