import { randomBytes } from "node:crypto";
import process from "node:process";

const KEYCHAIN_SERVICE = "donna-gateway";
const KEYCHAIN_ACCOUNT = "gateway-password";

// Lazy-load keytar so that importing this module does not fail when keytar is
// unavailable (e.g. in test environments that never call the bootstrap path).
async function loadKeytar() {
  try {
    const mod = await import("keytar");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return mod.default ?? (mod as unknown as typeof mod.default);
  } catch {
    throw new Error(
      "keytar is required for OS keychain integration but could not be loaded.\n" +
        "Install it with: pnpm add keytar",
    );
  }
}

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
  const keytar = await loadKeytar();

  const existing = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  if (existing) {
    return existing;
  }

  // Generate a 32-byte (256-bit) URL-safe base64 password.
  const password = randomBytes(32).toString("base64url");

  await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, password);

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
