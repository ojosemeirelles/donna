/**
 * Identity Memory — persistent user identity and preferences.
 *
 * Stores name, language preferences, communication style, expertise, and
 * goals in ~/.donna/memory/identity.json. All I/O is wrapped in graceful-
 * fail guards so a corrupt or missing file never breaks agent bootstrap.
 */

import fs from "node:fs/promises";
import path from "node:path";

export type IdentityMemoryConfig = {
  /** Enable identity memory layer. Default: true. */
  enabled?: boolean;
};

export type UserIdentity = {
  name?: string;
  preferredLanguage?: string;
  timezone?: string;
  communicationStyle?: "formal" | "casual" | "technical";
  expertise?: string[];
  goals?: string[];
  preferences?: Record<string, string>;
  updatedAt?: string;
};

const IDENTITY_FILE = "identity.json";
const DEFAULT_LANGUAGE = "pt";

const NAME_PATTERN =
  /(?:my name is|i'm|i am|sou o|sou a|me chamo|meu nome[_ ]?[eé])\s+([A-Z][a-z]+)/i;
// Use lookahead/lookbehind-free patterns since \b doesn't work with Unicode accented chars.
const PT_PATTERNS =
  /(?:^|[\s,!?])(?:você|oi|olá|bom dia|obrigado|obrigada|por favor|quero|preciso|gostaria)(?:[\s,!?]|$)/i;
const EN_PATTERNS = /\b(?:please|thank you|hello|hi there|I want|I need|could you|would you)\b/i;

/** Resolves config with defaults applied. */
export function resolveIdentityConfig(raw?: IdentityMemoryConfig): Required<IdentityMemoryConfig> {
  return { enabled: raw?.enabled ?? true };
}

/** Deduplicates a string array, filtering empty strings. */
function deduped(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * Merges an update into the current identity.
 * Array fields (expertise, goals) are unioned and deduplicated.
 * Record fields (preferences) are merged with update taking precedence.
 */
export function mergeIdentityUpdate(
  current: UserIdentity,
  update: Partial<UserIdentity>,
): UserIdentity {
  const expertise = deduped([...(current.expertise ?? []), ...(update.expertise ?? [])]);
  const goals = deduped([...(current.goals ?? []), ...(update.goals ?? [])]);
  const preferences: Record<string, string> = {
    ...current.preferences,
    ...update.preferences,
  };
  return {
    ...current,
    ...update,
    expertise: expertise.length > 0 ? expertise : undefined,
    goals: goals.length > 0 ? goals : undefined,
    preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Scans messages for basic identity clues (language preference, name).
 * Returns a partial identity — caller decides whether to apply it.
 */
export function extractIdentityClues(
  messages: Array<{ role: string; content: string }>,
): Partial<UserIdentity> {
  const result: Partial<UserIdentity> = {};
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  if (PT_PATTERNS.test(userText)) {
    result.preferredLanguage = "pt";
  } else if (EN_PATTERNS.test(userText)) {
    result.preferredLanguage = "en";
  }

  const nameMatch = NAME_PATTERN.exec(userText);
  if (nameMatch?.[1]) {
    result.name = nameMatch[1];
  }

  return result;
}

/**
 * Builds the Markdown context block injected into the agent's system prompt.
 * Returns an empty string when the identity has no meaningful data.
 */
export function buildIdentityContextBlock(identity: UserIdentity): string {
  const hasData =
    identity.name ??
    identity.preferredLanguage ??
    identity.timezone ??
    identity.communicationStyle ??
    identity.expertise?.length ??
    identity.goals?.length ??
    (identity.preferences && Object.keys(identity.preferences).length > 0);

  if (!hasData) {
    return "";
  }

  const lines: string[] = ["## User Identity"];
  if (identity.name) {
    lines.push(`- Name: ${identity.name}`);
  }
  if (identity.preferredLanguage) {
    const lang =
      identity.preferredLanguage === "pt" ? "Portuguese (pt)" : identity.preferredLanguage;
    lines.push(`- Preferred language: ${lang}`);
  }
  if (identity.timezone) {
    lines.push(`- Timezone: ${identity.timezone}`);
  }
  if (identity.communicationStyle) {
    lines.push(`- Communication style: ${identity.communicationStyle}`);
  }
  if (identity.expertise?.length) {
    lines.push(`- Expertise: ${identity.expertise.join(", ")}`);
  }
  if (identity.goals?.length) {
    lines.push(`- Goals: ${identity.goals.join("; ")}`);
  }
  if (identity.preferences) {
    for (const [k, v] of Object.entries(identity.preferences)) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}

/** Returns the preferred language from identity, defaulting to "pt". */
export function getIdentityLanguage(identity: UserIdentity): string {
  return identity.preferredLanguage ?? DEFAULT_LANGUAGE;
}

/** Loads identity from <memoryDir>/identity.json. Returns {} on miss/error. */
export async function loadIdentity(memoryDir: string): Promise<UserIdentity> {
  const filePath = path.join(memoryDir, IDENTITY_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as UserIdentity;
  } catch {
    return {};
  }
}

/** Saves identity to <memoryDir>/identity.json, creating the dir if needed. */
export async function saveIdentity(memoryDir: string, identity: UserIdentity): Promise<void> {
  await fs.mkdir(memoryDir, { recursive: true });
  const filePath = path.join(memoryDir, IDENTITY_FILE);
  await fs.writeFile(filePath, JSON.stringify(identity, null, 2), "utf-8");
}

/**
 * Loads identity, merges the update, saves the result, and returns it.
 * Gracefully handles missing files by starting from an empty identity.
 */
export async function updateIdentity(
  memoryDir: string,
  update: Partial<UserIdentity>,
): Promise<UserIdentity> {
  const current = await loadIdentity(memoryDir);
  const merged = mergeIdentityUpdate(current, update);
  await saveIdentity(memoryDir, merged);
  return merged;
}
