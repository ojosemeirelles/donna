export type {
  ShadowDefinition,
  ShadowRegistry,
  ShadowStatus,
  ShadowIntent,
  ShadowSessionMeta,
  ShadowExecution,
  ShadowDispatchResult,
  ParentContext,
} from "./types.js";
export { INTENT_TO_SHADOW } from "./types.js";

export { loadRegistry, extractShadow, getShadowByRole, type ExtractResult } from "./extractor.js";

export {
  classifyIntent,
  orchestrate,
  getShadowArmyStatus,
  type OrchestrateResult,
} from "./orchestrator.js";

export { checkShadowUnlocks, formatShadowUnlockMessage, type UnlockResult } from "./rank-unlock.js";

export { buildShadowSystemPrompt } from "./session-prompt.js";

export {
  record as recordShadowExecution,
  readAllRecords as readAllShadowRecords,
  getHistory as getShadowHistory,
  getSummary as getShadowExecutionSummary,
  pruneOldRecords as pruneShadowHistory,
  type ShadowExecutionSummary,
} from "./tracker.js";

export {
  buildShadowSessionId,
  getOrCreateSession,
  destroySession,
  listActiveSessions,
  countActiveForParent,
  pruneStaleSessions,
  dispatch as dispatchShadow,
  buildExecutionRecord,
  type DispatchDeps,
} from "./session-manager.js";
