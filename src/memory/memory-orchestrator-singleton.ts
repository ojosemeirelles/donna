import { MemoryOrchestrator, type MemorySystemConfig } from "./memory-orchestrator.js";

let _instance: MemoryOrchestrator | undefined;

export function initGlobalMemoryOrchestrator(
  config?: MemorySystemConfig,
  stateDir?: string,
): MemoryOrchestrator {
  _instance = new MemoryOrchestrator(config, stateDir);
  return _instance;
}

export function getGlobalMemoryOrchestrator(): MemoryOrchestrator | undefined {
  return _instance;
}

/** Reset for tests only. */
export function __resetGlobalMemoryOrchestratorForTest(): void {
  _instance = undefined;
}
