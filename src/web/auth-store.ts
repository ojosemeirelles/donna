import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { formatCliCommand } from "../cli/command-format.js";
import { resolveOAuthDir } from "../config/paths.js";
import { info, success } from "../globals.js";
import { getChildLogger } from "../logging.js";
import { DEFAULT_ACCOUNT_ID } from "../routing/session-key.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import type { WebChannel } from "../utils.js";
import { jidToE164, resolveUserPath } from "../utils.js";

// ---------------------------------------------------------------------------
// Keychain integration (OS keychain via keytar, gracefully degraded)
// ---------------------------------------------------------------------------

const KEYCHAIN_SERVICE = "donna-whatsapp-creds";

// Stable per-authDir keychain account key.
function keychainAccount(authDir: string): string {
  return `wa-creds:${path.resolve(authDir)}`;
}

// Lazy-load keytar so importing this module never fails in envs without it
// (e.g. CI, unit tests). Returns null when keytar is unavailable.
async function loadKeytar(): Promise<{
  getPassword: (s: string, a: string) => Promise<string | null>;
  setPassword: (s: string, a: string, p: string) => Promise<void>;
  deletePassword: (s: string, a: string) => Promise<boolean>;
} | null> {
  try {
    const mod = await import("keytar");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (mod.default ?? mod) as never;
  } catch {
    return null; // keytar not built or unavailable — fall back to file store
  }
}

/** Path to a tiny sentinel file that signals creds live in the OS keychain. */
export function resolveCredsKeychainMarkerPath(authDir: string): string {
  return path.join(authDir, "creds.keychain");
}

/** Read WhatsApp credentials JSON from the OS keychain. Returns null when
 *  keytar is unavailable or no entry exists for this authDir. */
export async function readCredsFromKeychain(authDir: string): Promise<string | null> {
  const keytar = await loadKeytar();
  if (!keytar) {
    return null;
  }
  try {
    return await keytar.getPassword(KEYCHAIN_SERVICE, keychainAccount(authDir));
  } catch {
    return null;
  }
}

/** Write WhatsApp credentials JSON to the OS keychain.
 *  Also writes a tiny sentinel file so sync callers can detect keychain
 *  storage without having to call async keytar.
 *  Returns false when keytar is unavailable (plaintext file kept as-is). */
export async function writeCredsToKeychain(authDir: string, json: string): Promise<boolean> {
  const keytar = await loadKeytar();
  if (!keytar) {
    return false;
  }
  try {
    await keytar.setPassword(KEYCHAIN_SERVICE, keychainAccount(authDir), json);
    // Write sentinel so hasWebCredsSync() can detect this without async I/O.
    const markerPath = resolveCredsKeychainMarkerPath(authDir);
    fsSync.mkdirSync(path.dirname(markerPath), { recursive: true });
    fsSync.writeFileSync(markerPath, "", { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

/** Remove WhatsApp credentials from the OS keychain and delete the sentinel
 *  file. Safe to call even when keytar is unavailable or no entry exists. */
export async function deleteCredsFromKeychain(authDir: string): Promise<void> {
  const keytar = await loadKeytar();
  if (keytar) {
    try {
      await keytar.deletePassword(KEYCHAIN_SERVICE, keychainAccount(authDir));
    } catch {
      // best-effort
    }
  }
  try {
    fsSync.unlinkSync(resolveCredsKeychainMarkerPath(authDir));
  } catch {
    // best-effort
  }
}

/** Overwrite a file with zeros then delete it.
 *  Provides best-effort protection against trivial file-system forensics.
 *  The caller should treat this as best-effort — journaled/SSD storage may
 *  retain copies at the block level regardless. */
export async function secureDeleteFile(filePath: string): Promise<void> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 0) {
      const fh = await fs.open(filePath, "r+");
      try {
        await fh.write(Buffer.alloc(stat.size, 0), 0, stat.size, 0);
        await fh.datasync(); // flush zeros to disk before unlink
      } finally {
        await fh.close();
      }
    }
  } catch {
    // If we can't overwrite, still attempt deletion below
  }
  try {
    await fs.unlink(filePath);
  } catch {
    // best-effort
  }
}

/** Migrate any existing plaintext creds.json (and its backup) to the OS
 *  keychain, then securely delete the plaintext files.
 *
 *  Called automatically on each gateway startup so that operators who
 *  previously ran without keychain protection are transparently upgraded.
 *  No-ops when keytar is unavailable or no plaintext file is present. */
export async function migrateToKeychain(
  authDir: string = resolveDefaultWebAuthDir(),
): Promise<void> {
  const resolvedDir = resolveUserPath(authDir);
  const credsPath = resolveWebCredsPath(resolvedDir);
  const raw = readCredsJsonRaw(credsPath);
  if (!raw) {
    return;
  }
  try {
    JSON.parse(raw);
  } catch {
    return; // corrupt plaintext — don't migrate garbage to keychain
  }
  const stored = await writeCredsToKeychain(resolvedDir, raw);
  if (!stored) {
    return;
  } // keytar unavailable; leave plaintext in place
  await secureDeleteFile(credsPath);
  // Also erase the plaintext backup if it exists
  const backupPath = resolveWebCredsBackupPath(resolvedDir);
  if (readCredsJsonRaw(backupPath)) {
    await secureDeleteFile(backupPath);
  }
  getChildLogger({ module: "web-session" }).info(
    { authDir: resolvedDir },
    "migrated WhatsApp credentials from plaintext file to OS keychain",
  );
}

export function resolveDefaultWebAuthDir(): string {
  return path.join(resolveOAuthDir(), "whatsapp", DEFAULT_ACCOUNT_ID);
}

export const WA_WEB_AUTH_DIR = resolveDefaultWebAuthDir();

export function resolveWebCredsPath(authDir: string): string {
  return path.join(authDir, "creds.json");
}

export function resolveWebCredsBackupPath(authDir: string): string {
  return path.join(authDir, "creds.json.bak");
}

export function hasWebCredsSync(authDir: string): boolean {
  // Check keychain sentinel first (creds stored in OS keychain, no plaintext file)
  try {
    if (fsSync.existsSync(resolveCredsKeychainMarkerPath(authDir))) {
      return true;
    }
  } catch {
    // ignore
  }
  // Fall back to plaintext file
  try {
    const stats = fsSync.statSync(resolveWebCredsPath(authDir));
    return stats.isFile() && stats.size > 1;
  } catch {
    return false;
  }
}

export function readCredsJsonRaw(filePath: string): string | null {
  try {
    if (!fsSync.existsSync(filePath)) {
      return null;
    }
    const stats = fsSync.statSync(filePath);
    if (!stats.isFile() || stats.size <= 1) {
      return null;
    }
    return fsSync.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export function maybeRestoreCredsFromBackup(authDir: string): void {
  const logger = getChildLogger({ module: "web-session" });
  try {
    const credsPath = resolveWebCredsPath(authDir);
    const backupPath = resolveWebCredsBackupPath(authDir);
    const raw = readCredsJsonRaw(credsPath);
    if (raw) {
      // Validate that creds.json is parseable.
      JSON.parse(raw);
      return;
    }

    const backupRaw = readCredsJsonRaw(backupPath);
    if (!backupRaw) {
      return;
    }

    // Ensure backup is parseable before restoring.
    JSON.parse(backupRaw);
    fsSync.copyFileSync(backupPath, credsPath);
    try {
      fsSync.chmodSync(credsPath, 0o600);
    } catch {
      // best-effort on platforms that support it
    }
    logger.warn({ credsPath }, "restored corrupted WhatsApp creds.json from backup");
  } catch {
    // ignore
  }
}

export async function webAuthExists(authDir: string = resolveDefaultWebAuthDir()) {
  const resolvedAuthDir = resolveUserPath(authDir);
  // Check OS keychain first — creds may have been migrated away from disk.
  const keychainCreds = await readCredsFromKeychain(resolvedAuthDir);
  if (keychainCreds) {
    try {
      JSON.parse(keychainCreds);
      return true;
    } catch {
      // Corrupt keychain entry; fall through to plaintext check
    }
  }
  // Fall back to plaintext file
  maybeRestoreCredsFromBackup(resolvedAuthDir);
  const credsPath = resolveWebCredsPath(resolvedAuthDir);
  try {
    await fs.access(resolvedAuthDir);
  } catch {
    return false;
  }
  try {
    const stats = await fs.stat(credsPath);
    if (!stats.isFile() || stats.size <= 1) {
      return false;
    }
    const raw = await fs.readFile(credsPath, "utf-8");
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

async function clearLegacyBaileysAuthState(authDir: string) {
  const entries = await fs.readdir(authDir, { withFileTypes: true });
  const shouldDelete = (name: string) => {
    if (name === "oauth.json") {
      return false;
    }
    if (name === "creds.json" || name === "creds.json.bak") {
      return true;
    }
    if (!name.endsWith(".json")) {
      return false;
    }
    return /^(app-state-sync|session|sender-key|pre-key)-/.test(name);
  };
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile()) {
        return;
      }
      if (!shouldDelete(entry.name)) {
        return;
      }
      await fs.rm(path.join(authDir, entry.name), { force: true });
    }),
  );
}

export async function logoutWeb(params: {
  authDir?: string;
  isLegacyAuthDir?: boolean;
  runtime?: RuntimeEnv;
}) {
  const runtime = params.runtime ?? defaultRuntime;
  const resolvedAuthDir = resolveUserPath(params.authDir ?? resolveDefaultWebAuthDir());
  const exists = await webAuthExists(resolvedAuthDir);
  if (!exists) {
    runtime.log(info("No WhatsApp Web session found; nothing to delete."));
    return false;
  }
  // Remove keychain entry in addition to on-disk files.
  await deleteCredsFromKeychain(resolvedAuthDir);
  if (params.isLegacyAuthDir) {
    await clearLegacyBaileysAuthState(resolvedAuthDir);
  } else {
    await fs.rm(resolvedAuthDir, { recursive: true, force: true });
  }
  runtime.log(success("Cleared WhatsApp Web credentials."));
  return true;
}

export function readWebSelfId(authDir: string = resolveDefaultWebAuthDir()) {
  // Read the cached WhatsApp Web identity (jid + E.164) from disk if present.
  try {
    const credsPath = resolveWebCredsPath(resolveUserPath(authDir));
    if (!fsSync.existsSync(credsPath)) {
      return { e164: null, jid: null } as const;
    }
    const raw = fsSync.readFileSync(credsPath, "utf-8");
    const parsed = JSON.parse(raw) as { me?: { id?: string } } | undefined;
    const jid = parsed?.me?.id ?? null;
    const e164 = jid ? jidToE164(jid, { authDir }) : null;
    return { e164, jid } as const;
  } catch {
    return { e164: null, jid: null } as const;
  }
}

/**
 * Return the age (in milliseconds) of the cached WhatsApp web auth state, or null when missing.
 * Helpful for heartbeats/observability to spot stale credentials.
 */
export function getWebAuthAgeMs(authDir: string = resolveDefaultWebAuthDir()): number | null {
  try {
    const stats = fsSync.statSync(resolveWebCredsPath(resolveUserPath(authDir)));
    return Date.now() - stats.mtimeMs;
  } catch {
    return null;
  }
}

export function logWebSelfId(
  authDir: string = resolveDefaultWebAuthDir(),
  runtime: RuntimeEnv = defaultRuntime,
  includeChannelPrefix = false,
) {
  // Human-friendly log of the currently linked personal web session.
  const { e164, jid } = readWebSelfId(authDir);
  const details = e164 || jid ? `${e164 ?? "unknown"}${jid ? ` (jid ${jid})` : ""}` : "unknown";
  const prefix = includeChannelPrefix ? "Web Channel: " : "";
  runtime.log(info(`${prefix}${details}`));
}

export async function pickWebChannel(
  pref: WebChannel | "auto",
  authDir: string = resolveDefaultWebAuthDir(),
): Promise<WebChannel> {
  const choice: WebChannel = pref === "auto" ? "web" : pref;
  const hasWeb = await webAuthExists(authDir);
  if (!hasWeb) {
    throw new Error(
      `No WhatsApp Web session found. Run \`${formatCliCommand("donna channels login --channel whatsapp --verbose")}\` to link.`,
    );
  }
  return choice;
}
