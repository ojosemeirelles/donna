import { describe, expect, it } from "vitest";
import type { DonnaConfig } from "../config/config.js";
import { resolveOnboardingSecretInputString } from "./onboarding.secret-input.js";

function makeConfig(): DonnaConfig {
  return {
    secrets: {
      providers: {
        default: { source: "env" },
      },
    },
  } as DonnaConfig;
}

describe("resolveOnboardingSecretInputString", () => {
  it("resolves env-template SecretInput strings", async () => {
    const resolved = await resolveOnboardingSecretInputString({
      config: makeConfig(),
      value: "${DONNA_GATEWAY_PASSWORD}",
      path: "gateway.auth.password",
      env: {
        DONNA_GATEWAY_PASSWORD: "gateway-secret",
      },
    });

    expect(resolved).toBe("gateway-secret");
  });

  it("returns plaintext strings when value is not a SecretRef", async () => {
    const resolved = await resolveOnboardingSecretInputString({
      config: makeConfig(),
      value: "plain-text",
      path: "gateway.auth.password",
    });

    expect(resolved).toBe("plain-text");
  });

  it("throws with path context when env-template SecretRef cannot resolve", async () => {
    await expect(
      resolveOnboardingSecretInputString({
        config: makeConfig(),
        value: "${DONNA_GATEWAY_PASSWORD}",
        path: "gateway.auth.password",
        env: {},
      }),
    ).rejects.toThrow(
      'gateway.auth.password: failed to resolve SecretRef "env:default:DONNA_GATEWAY_PASSWORD"',
    );
  });
});
