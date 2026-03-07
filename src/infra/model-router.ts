/**
 * Model Router — automatic complexity-based model tier selection.
 *
 * Classifies prompts into haiku / sonnet / opus based on content keywords,
 * estimated token count, and session context. All utilities are pure functions
 * with no I/O side-effects.
 */

export type ModelTier = "haiku" | "sonnet" | "opus";

export type ModelRouterConfig = {
  enabled?: boolean;
  thresholds?: {
    haiku?: number;
    sonnet?: number;
  };
};

export type ModelRouterContext = {
  isCronJob?: boolean;
  isSubagent?: boolean;
  accumulatedContextTokens?: number;
};

const DEFAULT_HAIKU_THRESHOLD = 500;
const DEFAULT_SONNET_THRESHOLD = 2000;

/** Keywords that indicate a complex, reasoning-heavy task → opus. */
const OPUS_KEYWORDS = [
  "analyze",
  "architect",
  "debug",
  "design",
  "explain",
  "implement",
  "refactor",
  "review",
  "optimize",
  "reasoning",
  "multi-step",
  "complex",
  "architecture",
] as const;

/** Keywords that indicate a lightweight, factual task → haiku (when prompt is short). */
const HAIKU_KEYWORDS = [
  "status",
  "check",
  "confirm",
  "ping",
  "list",
  "count",
  "yes",
  "no",
] as const;

/** Rough token estimator (~4 chars = 1 token, as per OpenAI convention). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Returns true if the text contains any opus-tier complexity keyword. */
export function containsComplexityKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return OPUS_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Applies config defaults and returns a fully-resolved config object. */
export function resolveModelRouterConfig(raw?: ModelRouterConfig): Required<ModelRouterConfig> {
  return {
    enabled: raw?.enabled ?? true,
    thresholds: {
      haiku: raw?.thresholds?.haiku ?? DEFAULT_HAIKU_THRESHOLD,
      sonnet: raw?.thresholds?.sonnet ?? DEFAULT_SONNET_THRESHOLD,
    },
  };
}

/**
 * Core classifier: maps a prompt + context → model tier.
 *
 * Classification order:
 * 1. Disabled → "sonnet" (safe default, no classification)
 * 2. Cron job → "haiku" (absolute, ignores context accumulation)
 * 3. Contains opus keyword → "opus"
 * 4. Contains haiku keyword AND tokens < haiku threshold → "haiku"
 * 5. tokens < haiku threshold → "haiku"
 * 6. tokens < sonnet threshold → "sonnet"
 * 7. otherwise → "opus"
 *
 * Post-step: if result is "haiku" AND accumulatedContextTokens > 50 000, promote to "sonnet".
 */
export function classifyPromptComplexity(
  prompt: string,
  context?: ModelRouterContext,
  config?: ModelRouterConfig,
): ModelTier {
  const cfg = resolveModelRouterConfig(config);

  if (!cfg.enabled) {
    return "sonnet";
  }

  // Cron jobs are cheap background tasks — always haiku, no promotion.
  if (context?.isCronJob) {
    return "haiku";
  }

  const tier = _classifyByContent(prompt, cfg);

  // Large accumulated context means the conversation is complex → promote haiku to sonnet.
  if (tier === "haiku" && (context?.accumulatedContextTokens ?? 0) > 50_000) {
    return "sonnet";
  }

  return tier;
}

function _classifyByContent(prompt: string, cfg: Required<ModelRouterConfig>): ModelTier {
  const lower = prompt.toLowerCase();
  const tokens = estimateTokens(prompt);
  const haikuThreshold = (cfg.thresholds as { haiku: number }).haiku;
  const sonnetThreshold = (cfg.thresholds as { sonnet: number }).sonnet;

  if (OPUS_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "opus";
  }
  if (HAIKU_KEYWORDS.some((kw) => lower.includes(kw)) && tokens < haikuThreshold) {
    return "haiku";
  }
  if (tokens < haikuThreshold) {
    return "haiku";
  }
  if (tokens < sonnetThreshold) {
    return "sonnet";
  }
  return "opus";
}
