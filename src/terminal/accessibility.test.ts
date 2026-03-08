import { describe, expect, it } from "vitest";
import { getOutputMode, isScreenReaderActive } from "./accessibility.js";

describe("isScreenReaderActive", () => {
  it("returns false with empty env", () => {
    expect(isScreenReaderActive({})).toBe(false);
  });

  it("detects TERM=dumb", () => {
    expect(isScreenReaderActive({ TERM: "dumb" })).toBe(true);
    expect(isScreenReaderActive({ TERM: "DUMB" })).toBe(true);
  });

  it("ignores TERM=xterm", () => {
    expect(isScreenReaderActive({ TERM: "xterm-256color" })).toBe(false);
  });

  it("detects CI=true", () => {
    expect(isScreenReaderActive({ CI: "true" })).toBe(true);
    expect(isScreenReaderActive({ CI: "1" })).toBe(true);
    expect(isScreenReaderActive({ CI: "yes" })).toBe(true);
  });

  it("ignores CI=false", () => {
    expect(isScreenReaderActive({ CI: "false" })).toBe(false);
    expect(isScreenReaderActive({ CI: "0" })).toBe(false);
  });

  it("detects NO_COLOR (any value, including empty string)", () => {
    expect(isScreenReaderActive({ NO_COLOR: "" })).toBe(true);
    expect(isScreenReaderActive({ NO_COLOR: "1" })).toBe(true);
  });

  it("detects ACCESSIBILITY=true", () => {
    expect(isScreenReaderActive({ ACCESSIBILITY: "true" })).toBe(true);
    expect(isScreenReaderActive({ ACCESSIBILITY: "1" })).toBe(true);
  });

  it("detects NVDA", () => {
    expect(isScreenReaderActive({ NVDA: "1" })).toBe(true);
  });

  it("detects JAWS", () => {
    expect(isScreenReaderActive({ JAWS: "true" })).toBe(true);
  });

  it("detects VOICEOVER", () => {
    expect(isScreenReaderActive({ VOICEOVER: "yes" })).toBe(true);
  });

  it("detects ORCA", () => {
    expect(isScreenReaderActive({ ORCA: "1" })).toBe(true);
  });

  it("returns false when assistive tech vars are set but falsy", () => {
    expect(isScreenReaderActive({ NVDA: "0" })).toBe(false);
    expect(isScreenReaderActive({ JAWS: "false" })).toBe(false);
  });
});

describe("getOutputMode", () => {
  it("returns visual with clean env", () => {
    expect(getOutputMode({})).toBe("visual");
  });

  it("returns accessible when screen reader is detected", () => {
    expect(getOutputMode({ TERM: "dumb" })).toBe("accessible");
    expect(getOutputMode({ CI: "true" })).toBe("accessible");
    expect(getOutputMode({ NO_COLOR: "" })).toBe("accessible");
    expect(getOutputMode({ ACCESSIBILITY: "1" })).toBe("accessible");
  });

  it("returns visual when only normal vars are present", () => {
    expect(getOutputMode({ TERM: "xterm-256color", HOME: "/home/user" })).toBe("visual");
  });
});
