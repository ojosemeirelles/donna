import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { DonnaConfig } from "../config/config.js";
import {
  onboardingSteps,
  getStepById,
  getRequiredSteps,
  evaluateSteps,
  isOnboardingComplete,
} from "./steps.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyConfig(): DonnaConfig {
  return {} as DonnaConfig;
}

function configWithAuthProfile(): DonnaConfig {
  return {
    auth: {
      profiles: {
        anthropic: { provider: "anthropic", mode: "api_key" },
      },
    },
  } as DonnaConfig;
}

function configWithGateway(): DonnaConfig {
  return {
    gateway: {
      port: 18789,
      auth: { token: "test-token-123" },
    },
  } as DonnaConfig;
}

function configWithChannel(): DonnaConfig {
  return {
    channels: {
      telegram: { botToken: "123:ABC" },
    },
  } as DonnaConfig;
}

function fullConfig(): DonnaConfig {
  return {
    auth: {
      profiles: {
        anthropic: { provider: "anthropic", mode: "api_key" },
      },
    },
    gateway: {
      port: 18789,
      auth: { token: "test-token-123" },
    },
    channels: {
      telegram: { botToken: "123:ABC" },
    },
  } as DonnaConfig;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onboardingSteps", () => {
  it("has 5 steps in order", () => {
    expect(onboardingSteps).toHaveLength(5);
    expect(onboardingSteps.map((s) => s.id)).toEqual([
      "config",
      "gateway",
      "channel",
      "test-message",
      "done",
    ]);
  });

  it("has exactly 2 required steps (config and gateway)", () => {
    const required = getRequiredSteps();
    expect(required).toHaveLength(2);
    expect(required.map((s) => s.id)).toEqual(["config", "gateway"]);
  });
});

describe("getStepById", () => {
  it("returns the step for a known id", () => {
    const step = getStepById("config");
    expect(step).toBeDefined();
    expect(step?.title).toBe("Configuration");
  });

  it("returns undefined for an unknown id", () => {
    expect(getStepById("nonexistent")).toBeUndefined();
  });
});

describe("step validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear env vars that affect validation.
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DONNA_GATEWAY_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("config step", () => {
    it("returns false when no auth is configured", async () => {
      const step = getStepById("config");
      expect(await step?.validate(emptyConfig())).toBe(false);
    });

    it("returns true when auth profiles exist", async () => {
      const step = getStepById("config");
      expect(await step?.validate(configWithAuthProfile())).toBe(true);
    });

    it("returns true when ANTHROPIC_API_KEY env var is set", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const step = getStepById("config");
      expect(await step?.validate(emptyConfig())).toBe(true);
    });
  });

  describe("gateway step", () => {
    it("returns false when no gateway config", async () => {
      const step = getStepById("gateway");
      expect(await step?.validate(emptyConfig())).toBe(false);
    });

    it("returns true when gateway port and auth token are set", async () => {
      const step = getStepById("gateway");
      expect(await step?.validate(configWithGateway())).toBe(true);
    });

    it("returns true when DONNA_GATEWAY_TOKEN env var is set", async () => {
      process.env.DONNA_GATEWAY_TOKEN = "env-token";
      const step = getStepById("gateway");
      // Still needs a port > 0 — resolveGatewayPort returns default (18789)
      // for empty config, so this should pass.
      expect(await step?.validate(emptyConfig())).toBe(true);
    });
  });

  describe("channel step", () => {
    it("returns false with no channels", async () => {
      const step = getStepById("channel");
      expect(await step?.validate(emptyConfig())).toBe(false);
    });

    it("returns true with telegram configured", async () => {
      const step = getStepById("channel");
      expect(await step?.validate(configWithChannel())).toBe(true);
    });
  });

  describe("test-message step", () => {
    it("always returns false (runtime-only)", async () => {
      const step = getStepById("test-message");
      expect(await step?.validate(fullConfig())).toBe(false);
    });
  });

  describe("done step", () => {
    it("always returns false (terminal)", async () => {
      const step = getStepById("done");
      expect(await step?.validate(fullConfig())).toBe(false);
    });
  });
});

describe("evaluateSteps", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DONNA_GATEWAY_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns a map with all step ids", async () => {
    const result = await evaluateSteps(emptyConfig());
    expect(result.size).toBe(5);
    for (const step of onboardingSteps) {
      expect(result.has(step.id)).toBe(true);
    }
  });

  it("marks config and gateway as true for full config", async () => {
    const result = await evaluateSteps(fullConfig());
    expect(result.get("config")).toBe(true);
    expect(result.get("gateway")).toBe(true);
    expect(result.get("channel")).toBe(true);
  });
});

describe("isOnboardingComplete", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DONNA_GATEWAY_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false for empty config", async () => {
    expect(await isOnboardingComplete(emptyConfig())).toBe(false);
  });

  it("returns true when config + gateway are satisfied", async () => {
    const config = {
      ...configWithAuthProfile(),
      ...configWithGateway(),
    } as DonnaConfig;
    expect(await isOnboardingComplete(config)).toBe(true);
  });
});
