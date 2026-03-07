/**
 * Auto-Compact — session compaction utilities.
 *
 * Evaluates whether a session needs compaction based on context usage,
 * extracts key information from message history, and generates a compact
 * system prompt to resume the session. All functions are pure utilities
 * with no I/O side-effects; writing state to disk is a separate concern.
 */

export type AutoCompactConfig = {
  /** Enable automatic compaction. Default: true. */
  enabled?: boolean;
  /** Fraction of context window that triggers compaction. Default: 0.70. */
  threshold?: number;
  /** Number of most-recent messages to preserve verbatim. Default: 10. */
  preserveLastN?: number;
};

export type CompactionCandidate = {
  shouldCompact: boolean;
  usageRatio: number;
  currentTokens: number;
  contextWindowTokens: number;
  reason: string;
};

export type CompactionSummary = {
  decisions: string[];
  pendingTasks: string[];
  credentials: string[];
  keyFacts: string[];
  compactedAt: string;
  messageCountBefore: number;
};

const DEFAULT_THRESHOLD = 0.7;
const DEFAULT_PRESERVE_LAST_N = 10;

/** Patterns that suggest a pending task in message text. */
const PENDING_TASK_PATTERNS = [/\bTODO\b/i, /\bFIXME\b/i, /\bpendente\b/i, /\bpending\b/i];

/** Patterns that suggest a credential mention. */
const CREDENTIAL_PATTERNS = [
  /\b(?:token|api[_-]?key|password|passwd|secret|bearer|auth)[:\s=]+\S+/gi,
  /\b[A-Za-z0-9_-]{20,}\b/g, // long opaque strings
];

/** Resolves config with defaults applied. */
export function resolveAutoCompactConfig(raw?: AutoCompactConfig): Required<AutoCompactConfig> {
  return {
    enabled: raw?.enabled ?? true,
    threshold: raw?.threshold ?? DEFAULT_THRESHOLD,
    preserveLastN: raw?.preserveLastN ?? DEFAULT_PRESERVE_LAST_N,
  };
}

/**
 * Evaluates whether compaction is needed based on current token usage.
 */
export function evaluateCompactionNeed(params: {
  currentTokens: number;
  contextWindowTokens: number;
  config?: AutoCompactConfig;
}): CompactionCandidate {
  const { currentTokens, contextWindowTokens, config } = params;
  const cfg = resolveAutoCompactConfig(config);

  if (!cfg.enabled) {
    return {
      shouldCompact: false,
      usageRatio: currentTokens / contextWindowTokens,
      currentTokens,
      contextWindowTokens,
      reason: "compaction disabled",
    };
  }

  const usageRatio = contextWindowTokens > 0 ? currentTokens / contextWindowTokens : 0;
  const shouldCompact = usageRatio >= cfg.threshold;

  return {
    shouldCompact,
    usageRatio,
    currentTokens,
    contextWindowTokens,
    reason: shouldCompact
      ? `usage ratio ${(usageRatio * 100).toFixed(1)}% >= threshold ${(cfg.threshold * 100).toFixed(1)}%`
      : `usage ratio ${(usageRatio * 100).toFixed(1)}% below threshold`,
  };
}

/**
 * Extracts text content from a message content field (string or content blocks).
 */
function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }
      if (block && typeof block === "object") {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          return b.text;
        }
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Extracts credential mentions from a text string. */
export function extractCredentialMentions(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CREDENTIAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // Only record the key name, not the value, for safety.
      const snippet = match[0].slice(0, 40);
      found.add(snippet);
    }
  }
  return Array.from(found);
}

/** Extracts pending task mentions from a text string. */
export function extractPendingTasks(text: string): string[] {
  const tasks: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (PENDING_TASK_PATTERNS.some((p) => p.test(line))) {
      const trimmed = line.trim().slice(0, 120);
      if (trimmed) {
        tasks.push(trimmed);
      }
    }
  }
  return tasks;
}

/**
 * Generates a compact summary of the session messages.
 * Preserves the last N messages verbatim in the output (they won't be compacted).
 */
export function generateSessionSummary(
  messages: Array<{ role: string; content: unknown }>,
  config?: AutoCompactConfig,
): CompactionSummary {
  const cfg = resolveAutoCompactConfig(config);
  const preserveN = cfg.preserveLastN;

  // Only analyze messages that would be compacted (all except last N).
  const toCompact =
    messages.length > preserveN ? messages.slice(0, messages.length - preserveN) : [];

  const decisions: string[] = [];
  const pendingTasks: string[] = [];
  const credentials: string[] = [];
  const keyFacts: string[] = [];

  for (const msg of toCompact) {
    const text = extractText(msg.content);
    if (!text) {
      continue;
    }

    const tasks = extractPendingTasks(text);
    pendingTasks.push(...tasks);

    const creds = extractCredentialMentions(text);
    credentials.push(...creds);

    // Extract assistant decisions (short lines beginning with decision-like phrases).
    if (msg.role === "assistant") {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 10 && trimmed.length < 200) {
          keyFacts.push(trimmed.slice(0, 160));
          if (keyFacts.length >= 20) {
            break;
          }
        }
      }
    }
  }

  return {
    decisions: Array.from(new Set(decisions)),
    pendingTasks: Array.from(new Set(pendingTasks)),
    credentials: Array.from(new Set(credentials)),
    keyFacts: keyFacts.slice(0, 20),
    compactedAt: new Date().toISOString(),
    messageCountBefore: messages.length,
  };
}

/**
 * Generates a system prompt prefix that summarizes the compacted session,
 * to be prepended when the session is resumed.
 */
export function buildCompactionSystemPrompt(summary: CompactionSummary): string {
  const parts: string[] = ["# Session Context (Compacted)", ""];
  parts.push(`Compacted at: ${summary.compactedAt}`);
  parts.push(`Messages before compaction: ${summary.messageCountBefore}`);
  parts.push("");

  if (summary.pendingTasks.length > 0) {
    parts.push("## Pending Tasks");
    for (const task of summary.pendingTasks) {
      parts.push(`- ${task}`);
    }
    parts.push("");
  }

  if (summary.keyFacts.length > 0) {
    parts.push("## Key Facts from Session");
    for (const fact of summary.keyFacts.slice(0, 10)) {
      parts.push(`- ${fact}`);
    }
    parts.push("");
  }

  if (summary.credentials.length > 0) {
    parts.push("## Credentials Mentioned");
    for (const cred of summary.credentials) {
      parts.push(`- ${cred}`);
    }
    parts.push("");
  }

  if (summary.decisions.length > 0) {
    parts.push("## Decisions Made");
    for (const decision of summary.decisions) {
      parts.push(`- ${decision}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}
