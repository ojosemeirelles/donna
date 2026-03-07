/**
 * Context Budget — tiered bootstrap context + tool output limits.
 *
 * Detects the appropriate bootstrap tier for the current session and
 * enforces token budgets on tool outputs. All functions are pure utilities
 * with no I/O side-effects.
 */

export type BootstrapTier = "minimal" | "standard" | "full";

export type ContextBudgetConfig = {
  /** Enable context budget enforcement. Default: true. */
  enabled?: boolean;
  /** Maximum tokens for a single tool output before truncation. Default: 2000. */
  toolOutputLimitTokens?: number;
};

export type SessionContext = {
  isCronJob?: boolean;
  isSubagent?: boolean;
  /** User explicitly requested full context (e.g. via a flag or command). */
  isExplicitFull?: boolean;
  agentId?: string;
};

const DEFAULT_TOOL_OUTPUT_LIMIT_TOKENS = 2000;
const TRUNCATION_MARKER = "[TRUNCATED — use /expand for full output]";

/** Resolves config with defaults applied. */
export function resolveContextBudgetConfig(
  raw?: ContextBudgetConfig,
): Required<ContextBudgetConfig> {
  return {
    enabled: raw?.enabled ?? true,
    toolOutputLimitTokens: raw?.toolOutputLimitTokens ?? DEFAULT_TOOL_OUTPUT_LIMIT_TOKENS,
  };
}

/**
 * Detects the bootstrap tier appropriate for the session.
 *
 * - `minimal`: Cron jobs and sub-agents that don't need full user context.
 * - `full`: User explicitly requested full context loading.
 * - `standard`: Everything else (interactive user sessions).
 */
export function detectBootstrapTier(context: SessionContext): BootstrapTier {
  if (context.isCronJob || context.isSubagent) {
    return "minimal";
  }
  if (context.isExplicitFull) {
    return "full";
  }
  return "standard";
}

/**
 * Describes what each bootstrap tier includes when loading session context.
 */
export function describeBootstrapTier(tier: BootstrapTier): {
  includeMemoryMd: boolean;
  includeUserMd: boolean;
  includeExtraFiles: boolean;
} {
  switch (tier) {
    case "minimal":
      return { includeMemoryMd: false, includeUserMd: false, includeExtraFiles: false };
    case "standard":
      return { includeMemoryMd: true, includeUserMd: true, includeExtraFiles: false };
    case "full":
      return { includeMemoryMd: true, includeUserMd: true, includeExtraFiles: true };
  }
}

/**
 * Filters file content by extracting only lines that match any of the keywords,
 * plus a configurable number of context lines around each match.
 *
 * Returns an empty string when no keywords match.
 */
export function filterContentByKeywords(
  content: string,
  keywords: string[],
  contextLines = 3,
): string {
  if (keywords.length === 0) {
    return "";
  }
  const lines = content.split(/\r?\n/);
  const matchedIndices = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (keywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase()))) {
      for (
        let j = Math.max(0, i - contextLines);
        j <= Math.min(lines.length - 1, i + contextLines);
        j++
      ) {
        matchedIndices.add(j);
      }
    }
  }

  if (matchedIndices.size === 0) {
    return "";
  }

  const sortedIndices = Array.from(matchedIndices).toSorted((a, b) => a - b);
  const result: string[] = [];
  let lastIdx = -1;

  for (const idx of sortedIndices) {
    if (lastIdx !== -1 && idx > lastIdx + 1) {
      result.push("...");
    }
    result.push(lines[idx] ?? "");
    lastIdx = idx;
  }

  return result.join("\n");
}

/**
 * Enforces a token budget on tool output text.
 * If the output exceeds `limitTokens` (estimated), it is truncated and a
 * marker is appended. Short outputs are returned unchanged.
 */
export function enforceToolOutputBudget(output: string, limitTokens?: number): string {
  const limit = limitTokens ?? DEFAULT_TOOL_OUTPUT_LIMIT_TOKENS;
  const maxChars = limit * 4; // ~4 chars per token

  if (output.length <= maxChars) {
    return output;
  }

  const truncated = output.slice(0, maxChars);
  return `${truncated}\n${TRUNCATION_MARKER}`;
}

/**
 * Returns true if the output string contains the truncation marker,
 * indicating it was previously truncated by `enforceToolOutputBudget`.
 */
export function isToolOutputTruncated(output: string): boolean {
  return output.includes(TRUNCATION_MARKER);
}
