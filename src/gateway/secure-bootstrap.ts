import { randomBytes } from "node:crypto";
import process from "node:process";

import { loadCredentialStore } from "../secrets/credential-store-factory.js";

const KEYCHAIN_SERVICE = "donna-gateway";
const KEYCHAIN_ACCOUNT = "gateway-password";

/**
 * Retrieve the gateway password from the OS keychain, or generate and store a
 * new cryptographically-secure one if none exists yet.
 *
 * When a new password is generated it is printed ONCE to stderr with a clear
 * warning so the operator can save it before the banner is gone.
 *
 * @returns The gateway password (existing or freshly generated).
 */
export async function getOrCreateGatewayPassword(): Promise<string> {
  const store = await loadCredentialStore();

  const existing = await store.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  if (existing) {
    return existing;
  }

  // Generate a 32-byte (256-bit) URL-safe base64 password.
  const password = randomBytes(32).toString("base64url");

  await store.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, password);

  // Display the generated password exactly once — it will not be shown again.
  const banner = [
    "",
    "╔══════════════════════════════════════════════════════════════════╗",
    "║           DONNA GATEWAY — FIRST BOOT SECURITY NOTICE            ║",
    "╠══════════════════════════════════════════════════════════════════╣",
    "║  No authentication credentials were configured.                 ║",
    "║  A cryptographically secure password has been generated and     ║",
    "║  stored in your OS keychain. Save it now — it will NOT be       ║",
    "║  shown again.                                                    ║",
    "║                                                                  ║",
    `║  Gateway password: ${password.padEnd(46)}║`,
    "║                                                                  ║",
    "║  To set a permanent password instead, add to your config:       ║",
    "║    gateway.auth.password = <your-password>                      ║",
    "║  or set env: DONNA_GATEWAY_PASSWORD=<your-password>             ║",
    "╚══════════════════════════════════════════════════════════════════╝",
    "",
  ].join("\n");

  process.stderr.write(banner);

  return password;
}
