/**
 * Platform-agnostic credential store interface.
 * Replaces direct keytar dependency with a pluggable backend:
 * - macOS: native Keychain via `security` CLI
 * - Linux/Windows: AES-256-GCM encrypted file
 */
export interface CredentialStore {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}
