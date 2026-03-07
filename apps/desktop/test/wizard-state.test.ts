import { describe, expect, it } from "vitest";
import {
  createInitialWizardState,
  nextStep,
  prevStep,
  stepIndexOf,
  canAdvance,
  isValidApiKey,
  isValidPort,
  validateStep,
  advanceWizard,
  goBackWizard,
  updateWizardData,
  wizardProgress,
  WIZARD_STEPS,
  type WizardState,
} from "../src/wizard/wizard-state.js";

// ---------------------------------------------------------------------------
// WIZARD_STEPS
// ---------------------------------------------------------------------------

describe("WIZARD_STEPS", () => {
  it("has exactly 5 steps", () => {
    expect(WIZARD_STEPS).toHaveLength(5);
  });

  it("starts with welcome and ends with done", () => {
    expect(WIZARD_STEPS[0]).toBe("welcome");
    expect(WIZARD_STEPS[4]).toBe("done");
  });

  it("includes all expected steps", () => {
    expect(WIZARD_STEPS).toContain("welcome");
    expect(WIZARD_STEPS).toContain("api-key");
    expect(WIZARD_STEPS).toContain("channel");
    expect(WIZARD_STEPS).toContain("preferences");
    expect(WIZARD_STEPS).toContain("done");
  });
});

// ---------------------------------------------------------------------------
// createInitialWizardState
// ---------------------------------------------------------------------------

describe("createInitialWizardState", () => {
  it("starts at welcome step", () => {
    const s = createInitialWizardState();
    expect(s.currentStep).toBe("welcome");
  });

  it("has stepIndex 0", () => {
    const s = createInitialWizardState();
    expect(s.stepIndex).toBe(0);
  });

  it("has totalSteps equal to WIZARD_STEPS length", () => {
    const s = createInitialWizardState();
    expect(s.totalSteps).toBe(WIZARD_STEPS.length);
  });

  it("is not completed initially", () => {
    const s = createInitialWizardState();
    expect(s.completed).toBe(false);
  });

  it("has empty errors initially", () => {
    const s = createInitialWizardState();
    expect(Object.keys(s.errors)).toHaveLength(0);
  });

  it("has default language 'pt'", () => {
    const s = createInitialWizardState();
    expect(s.data.language).toBe("pt");
  });

  it("has default port 18789", () => {
    const s = createInitialWizardState();
    expect(s.data.port).toBe(18789);
  });
});

// ---------------------------------------------------------------------------
// stepIndexOf
// ---------------------------------------------------------------------------

describe("stepIndexOf", () => {
  it("returns 0 for welcome", () => {
    expect(stepIndexOf("welcome")).toBe(0);
  });

  it("returns 4 for done", () => {
    expect(stepIndexOf("done")).toBe(4);
  });

  it("returns correct index for api-key", () => {
    expect(stepIndexOf("api-key")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// nextStep / prevStep
// ---------------------------------------------------------------------------

describe("nextStep", () => {
  it("returns api-key after welcome", () => {
    expect(nextStep("welcome")).toBe("api-key");
  });

  it("returns null for the done step", () => {
    expect(nextStep("done")).toBeNull();
  });

  it("returns preferences after channel", () => {
    expect(nextStep("channel")).toBe("preferences");
  });
});

describe("prevStep", () => {
  it("returns null for welcome", () => {
    expect(prevStep("welcome")).toBeNull();
  });

  it("returns welcome when at api-key", () => {
    expect(prevStep("api-key")).toBe("welcome");
  });

  it("returns channel when at preferences", () => {
    expect(prevStep("preferences")).toBe("channel");
  });
});

// ---------------------------------------------------------------------------
// isValidApiKey
// ---------------------------------------------------------------------------

describe("isValidApiKey", () => {
  it("returns true for valid sk-ant- key", () => {
    expect(isValidApiKey("sk-ant-api03-abc123def456ghi789jkl012")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidApiKey("")).toBe(false);
  });

  it("returns false for key without sk-ant- prefix", () => {
    expect(isValidApiKey("sk-something-else")).toBe(false);
  });

  it("returns false for very short sk-ant- key", () => {
    expect(isValidApiKey("sk-ant-abc")).toBe(false);
  });

  it("trims whitespace before validation", () => {
    expect(isValidApiKey("  sk-ant-api03-abc123def456ghi789jkl012  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidPort
// ---------------------------------------------------------------------------

describe("isValidPort", () => {
  it("returns true for 18789", () => {
    expect(isValidPort(18789)).toBe(true);
  });

  it("returns false for port 80 (below 1024)", () => {
    expect(isValidPort(80)).toBe(false);
  });

  it("returns false for port 0", () => {
    expect(isValidPort(0)).toBe(false);
  });

  it("returns false for port 65536 (above max)", () => {
    expect(isValidPort(65536)).toBe(false);
  });

  it("returns true for boundary 1024", () => {
    expect(isValidPort(1024)).toBe(true);
  });

  it("returns true for boundary 65535", () => {
    expect(isValidPort(65535)).toBe(true);
  });

  it("returns false for non-integer", () => {
    expect(isValidPort(18789.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateStep
// ---------------------------------------------------------------------------

describe("validateStep", () => {
  it("returns no errors for welcome step", () => {
    expect(validateStep("welcome", {})).toEqual({});
  });

  it("returns error for missing api key", () => {
    const errs = validateStep("api-key", {});
    expect(errs.apiKey).toBeDefined();
  });

  it("returns no errors for valid api key", () => {
    const errs = validateStep("api-key", { apiKey: "sk-ant-api03-abc123def456ghi789jkl012" });
    expect(Object.keys(errs)).toHaveLength(0);
  });

  it("returns error for invalid port in preferences", () => {
    const errs = validateStep("preferences", { port: 80 });
    expect(errs.port).toBeDefined();
  });

  it("returns no errors for valid port in preferences", () => {
    const errs = validateStep("preferences", { port: 18789 });
    expect(Object.keys(errs)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// canAdvance
// ---------------------------------------------------------------------------

describe("canAdvance", () => {
  it("returns true for welcome step (no validation)", () => {
    const s = createInitialWizardState();
    expect(canAdvance(s)).toBe(true);
  });

  it("returns false for api-key step without key", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "api-key",
      stepIndex: 1,
      data: {},
    };
    expect(canAdvance(s)).toBe(false);
  });

  it("returns true for api-key step with valid key", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "api-key",
      stepIndex: 1,
      data: { apiKey: "sk-ant-api03-abc123def456ghi789jkl012" },
    };
    expect(canAdvance(s)).toBe(true);
  });

  it("returns false for done step", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "done",
      stepIndex: 4,
    };
    expect(canAdvance(s)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// advanceWizard
// ---------------------------------------------------------------------------

describe("advanceWizard", () => {
  it("advances from welcome to api-key", () => {
    const s = createInitialWizardState();
    const next = advanceWizard(s);
    expect(next.currentStep).toBe("api-key");
  });

  it("returns validation errors when api key is invalid", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "api-key",
      stepIndex: 1,
      data: { apiKey: "bad-key" },
    };
    const next = advanceWizard(s);
    expect(next.currentStep).toBe("api-key"); // didn't advance
    expect(next.errors.apiKey).toBeDefined();
  });

  it("advances through all steps to done", () => {
    let s = createInitialWizardState();

    // welcome → api-key
    s = advanceWizard(s);
    expect(s.currentStep).toBe("api-key");

    // api-key → channel
    s = updateWizardData(s, { apiKey: "sk-ant-api03-abc123def456ghi789jkl012" });
    s = advanceWizard(s);
    expect(s.currentStep).toBe("channel");

    // channel → preferences
    s = updateWizardData(s, { channel: "telegram" });
    s = advanceWizard(s);
    expect(s.currentStep).toBe("preferences");

    // preferences → done
    s = updateWizardData(s, { port: 18789 });
    s = advanceWizard(s);
    expect(s.currentStep).toBe("done");
    expect(s.completed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// goBackWizard
// ---------------------------------------------------------------------------

describe("goBackWizard", () => {
  it("does not go back from welcome", () => {
    const s = createInitialWizardState();
    const prev = goBackWizard(s);
    expect(prev.currentStep).toBe("welcome");
  });

  it("goes back from api-key to welcome", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "api-key",
      stepIndex: 1,
    };
    const prev = goBackWizard(s);
    expect(prev.currentStep).toBe("welcome");
  });

  it("clears errors when going back", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "api-key",
      stepIndex: 1,
      errors: { apiKey: "invalid" },
    };
    const prev = goBackWizard(s);
    expect(Object.keys(prev.errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateWizardData
// ---------------------------------------------------------------------------

describe("updateWizardData", () => {
  it("merges data patch into existing data", () => {
    const s = createInitialWizardState();
    const updated = updateWizardData(s, { apiKey: "sk-ant-test-key-12345678901234" });
    expect(updated.data.apiKey).toBe("sk-ant-test-key-12345678901234");
    expect(updated.data.language).toBe("pt"); // unchanged
  });

  it("clears errors on update", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      errors: { apiKey: "bad key" },
    };
    const updated = updateWizardData(s, { language: "en" });
    expect(Object.keys(updated.errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// wizardProgress
// ---------------------------------------------------------------------------

describe("wizardProgress", () => {
  it("returns 0 at welcome step", () => {
    const s = createInitialWizardState();
    expect(wizardProgress(s)).toBe(0);
  });

  it("returns 100 at done step", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "done",
      stepIndex: 4,
    };
    expect(wizardProgress(s)).toBe(100);
  });

  it("returns a value between 0 and 100 for middle steps", () => {
    const s: WizardState = {
      ...createInitialWizardState(),
      currentStep: "channel",
      stepIndex: 2,
    };
    const pct = wizardProgress(s);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});
