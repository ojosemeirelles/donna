// Narrow plugin-sdk surface for the bundled llm-task plugin.
// Keep this list additive and scoped to symbols used under extensions/llm-task.

export { resolvePreferredDonnaTmpDir } from "../infra/tmp-donna-dir.js";
export type { AnyAgentTool, DonnaPluginApi } from "../plugins/types.js";
