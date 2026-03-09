export type { ShadowDefinition, ShadowRegistry, ShadowStatus, ShadowIntent } from "./types.js";
export { INTENT_TO_SHADOW } from "./types.js";

export { loadRegistry, extractShadow, getShadowByRole, type ExtractResult } from "./extractor.js";

export {
  classifyIntent,
  orchestrate,
  getShadowArmyStatus,
  type OrchestrateResult,
} from "./orchestrator.js";

export { checkShadowUnlocks, formatShadowUnlockMessage, type UnlockResult } from "./rank-unlock.js";
