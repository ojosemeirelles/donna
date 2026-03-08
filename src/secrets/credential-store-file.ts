/**
 * Encrypted file-based credential store (Linux/Windows fallback).
 * Uses AES-256-GCM with a machine-derived key. Credentials are stored as
 * a JSON map keyed by `${service}:${account}` inside an encrypted file.
 *
 * File format (binary):
 *   [16 bytes IV] [12 bytes auth tag] [... ciphertext ...]
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { homedir, hostname, platform } from "node:os";
import path from "node:path";
import type { CredentialStore } from "./credential-store.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/** Derive a stable 256-bit key from machine-specific properties.
 *  This is not a substitute for a proper KMS, but provides reasonable
 *  protection for credentials at rest when no OS keychain is available. */
function deriveMachineKey(): Buffer {
  // Combine hostname + platform + home directory as a stable machine fingerprint.
  // An attacker with filesystem access can reconstruct this, so the encrypted
  // file store is defense-in-depth rather than a strong security boundary.
  const material = `donna-credential-store:${hostname()}:${platform()}:${homedir()}`;
  return createHash("sha256").update(material).digest();
}

type StoreMap = Record<string, string>;

function storeKey(service: string, account: string): string {
  return `${service}:${account}`;
}

export class FileCredentialStore implements CredentialStore {
  private readonly filePath: string;
  private readonly encryptionKey: Buffer;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(homedir(), ".donna", "credentials", "secrets.enc");
    this.encryptionKey = deriveMachineKey();
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const store = await this.readStore();
    return store[storeKey(service, account)] ?? null;
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const store = await this.readStore();
    store[storeKey(service, account)] = password;
    await this.writeStore(store);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const store = await this.readStore();
    const key = storeKey(service, account);
    if (!(key in store)) {
      return false;
    }
    delete store[key];
    await this.writeStore(store);
    return true;
  }

  // -- internal helpers --

  private async readStore(): Promise<StoreMap> {
    let raw: Buffer;
    try {
      raw = await fs.readFile(this.filePath);
    } catch {
      return {}; // file does not exist yet — first use
    }

    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      return {}; // corrupt or empty
    }

    try {
      const iv = raw.subarray(0, IV_LENGTH);
      const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(decrypted.toString("utf-8")) as StoreMap;
    } catch {
      // Decryption or parse failure — treat as empty (key changed or file corrupt).
      return {};
    }
  }

  private async writeStore(store: StoreMap): Promise<void> {
    const plaintext = Buffer.from(JSON.stringify(store), "utf-8");
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    // Write atomically: write to temp then rename
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, Buffer.concat([iv, authTag, encrypted]), { mode: 0o600 });
    await fs.rename(tmpPath, this.filePath);
  }
}
