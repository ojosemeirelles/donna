/**
 * Factory that auto-detects the platform and returns the appropriate
 * CredentialStore implementation:
 * - macOS → KeychainCredentialStore (native `security` CLI)
 * - Linux/Windows → FileCredentialStore (AES-256-GCM encrypted file)
 *
 * Also provides a legacy-compatible `loadKeytar()` shim so existing code
 * can migrate incrementally.
 */
import { platform } from "node:os";
import type { CredentialStore } from "./credential-store.js";
import { FileCredentialStore } from "./credential-store-file.js";
import { KeychainCredentialStore } from "./credential-store-keychain.js";

let _instance: CredentialStore | undefined;

/** Return a singleton CredentialStore for the current platform. */
export function getCredentialStore(): CredentialStore {
  if (_instance) {
    return _instance;
  }

  if (platform() === "darwin") {
    _instance = new KeychainCredentialStore();
  } else {
    _instance = new FileCredentialStore();
  }

  return _instance;
}

/**
 * Drop-in replacement for the old `loadKeytar()` calls used throughout the
 * codebase. Returns the same `{ getPassword, setPassword, deletePassword }`
 * shape so callers need minimal changes.
 *
 * Unlike the old keytar loader, this never returns null — the file-based
 * fallback is always available. Callers that previously handled a null return
 * from keytar should still work (the fallback simply always succeeds).
 */
export async function loadCredentialStore(): Promise<CredentialStore> {
  return getCredentialStore();
}
