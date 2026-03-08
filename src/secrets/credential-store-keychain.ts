/**
 * macOS Keychain credential store using the `security` CLI.
 * Avoids native N-API dependencies entirely — shells out to the `security`
 * command which is always available on macOS.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CredentialStore } from "./credential-store.js";

const execFileAsync = promisify(execFile);

export class KeychainCredentialStore implements CredentialStore {
  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        service,
        "-a",
        account,
        "-w", // print password only
      ]);
      // `security` prints the password followed by a newline.
      const value = stdout.replace(/\n$/, "");
      return value.length > 0 ? value : null;
    } catch {
      // Exit code 44 = item not found; any other error also means "no password".
      return null;
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    // Delete first to avoid "already exists" errors (security add-generic-password
    // fails if an entry with the same service+account already exists).
    try {
      await execFileAsync("security", [
        "delete-generic-password",
        "-s",
        service,
        "-a",
        account,
      ]);
    } catch {
      // Ignore — entry may not exist yet.
    }

    await execFileAsync("security", [
      "add-generic-password",
      "-s",
      service,
      "-a",
      account,
      "-w",
      password,
      "-U", // update if exists (belt-and-suspenders after delete above)
    ]);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      await execFileAsync("security", [
        "delete-generic-password",
        "-s",
        service,
        "-a",
        account,
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
