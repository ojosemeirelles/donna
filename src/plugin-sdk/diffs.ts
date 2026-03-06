// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to symbols used under extensions/diffs.

export type { DonnaConfig } from "../config/config.js";
export { resolvePreferredDonnaTmpDir } from "../infra/tmp-donna-dir.js";
export type {
  AnyAgentTool,
  DonnaPluginApi,
  DonnaPluginConfigSchema,
  PluginLogger,
} from "../plugins/types.js";
