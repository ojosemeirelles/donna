import { describe, expect, it, afterEach } from "vitest";
import {
  initGlobalMemoryOrchestrator,
  getGlobalMemoryOrchestrator,
  __resetGlobalMemoryOrchestratorForTest,
} from "./memory-orchestrator-singleton.js";

describe("memory-orchestrator-singleton", () => {
  afterEach(() => {
    __resetGlobalMemoryOrchestratorForTest();
  });

  it("returns undefined before initialization", () => {
    expect(getGlobalMemoryOrchestrator()).toBeUndefined();
  });

  it("returns the instance after initialization", () => {
    const orchestrator = initGlobalMemoryOrchestrator();
    expect(getGlobalMemoryOrchestrator()).toBe(orchestrator);
  });

  it("initializes with memory disabled by default", () => {
    const orchestrator = initGlobalMemoryOrchestrator();
    expect(orchestrator.isEnabled()).toBe(false);
  });

  it("initializes with memory enabled when config says so", () => {
    const orchestrator = initGlobalMemoryOrchestrator({ enabled: true });
    expect(orchestrator.isEnabled()).toBe(true);
  });

  it("returns empty string from onSessionStart when disabled", async () => {
    const orchestrator = initGlobalMemoryOrchestrator({ enabled: false });
    const block = await orchestrator.onSessionStart("test-session");
    expect(block).toBe("");
  });

  it("replaces instance on re-initialization", () => {
    const first = initGlobalMemoryOrchestrator({ enabled: false });
    const second = initGlobalMemoryOrchestrator({ enabled: true });
    expect(getGlobalMemoryOrchestrator()).toBe(second);
    expect(second).not.toBe(first);
    expect(second.isEnabled()).toBe(true);
  });

  it("resets to undefined after test reset", () => {
    initGlobalMemoryOrchestrator();
    __resetGlobalMemoryOrchestratorForTest();
    expect(getGlobalMemoryOrchestrator()).toBeUndefined();
  });
});
