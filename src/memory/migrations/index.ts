import type { Migration } from "./types.js";
import { v001Baseline } from "./v001-baseline.js";
import { v002ShadowMissionControl } from "./v002-shadow-mission-control.js";

/**
 * All migrations in version order. Append new migrations at the end.
 * Each migration.version must be strictly greater than the previous one.
 */
export const migrations: Migration[] = [v001Baseline, v002ShadowMissionControl];

export type { Migration, SchemaVersionRow } from "./types.js";
export { MigrationRunner } from "./runner.js";
