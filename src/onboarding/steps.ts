/**
 * Unified onboarding steps — UI-agnostic data structure.
 *
 * Both CLI wizard and Desktop app can consume these steps.
 * Each step describes *what* needs to happen; the consumer decides *how*
 * to render/execute it (terminal prompts, Electron UI, web form, etc.).
 */

import type { DonnaConfig } from "../config/config.js";
import { readConfigFileSnapshot, resolveGatewayPort } from "../config/config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of executing (or validating) a single step. */
export interface StepResult {
  /** Whether the step completed successfully. */
  ok: boolean;
  /** Human-readable status message. */
  message: string;
  /** If not ok, an error detail for the consumer to display. */
  error?: string;
  /** Arbitrary data the step wants to pass downstream. */
  data?: Record<string, unknown>;
}

/** A single onboarding step definition. */
export interface OnboardingStep {
  /** Unique identifier for this step. */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** Longer description shown to the user. */
  description: string;
  /** Whether the user *must* complete this step to finish onboarding. */
  required: boolean;
  /**
   * Check whether this step is already satisfied (e.g. API key already
   * configured). Returns `true` when the step can be skipped.
   */
  validate: (config: DonnaConfig) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const configStep: OnboardingStep = {
  id: "config",
  title: "Configuration",
  description:
    "Set up your AI provider credentials (API key) and select the default model.",
  required: true,
  async validate(config) {
    // Considered done when at least one auth profile is configured or a
    // well-known provider env var is set.
    const hasProfiles =
      config.auth?.profiles !== undefined &&
      Object.keys(config.auth.profiles).length > 0;
    const hasEnvKey = Boolean(
      process.env.ANTHROPIC_API_KEY ??
        process.env.OPENAI_API_KEY ??
        process.env.GOOGLE_API_KEY,
    );
    return hasProfiles || hasEnvKey;
  },
};

const gatewayStep: OnboardingStep = {
  id: "gateway",
  title: "Gateway",
  description:
    "Configure the local gateway: port, bind address, authentication mode, and optional Tailscale exposure.",
  required: true,
  async validate(config) {
    // Gateway is configured when port and auth mode are set.
    const port = resolveGatewayPort(config);
    const hasAuth = Boolean(
      config.gateway?.auth?.token ??
        config.gateway?.auth?.password ??
        process.env.DONNA_GATEWAY_TOKEN,
    );
    return port > 0 && hasAuth;
  },
};

const channelStep: OnboardingStep = {
  id: "channel",
  title: "Channel Connection",
  description:
    "Connect at least one messaging channel (Telegram, WhatsApp, Discord, Slack, Signal, iMessage, etc.).",
  required: false,
  async validate(config) {
    // At least one channel has credentials configured.
    const ch = config.channels;
    if (!ch) return false;
    const hasTelegram = Boolean(ch.telegram?.botToken);
    const hasWhatsapp = Boolean(ch.whatsapp);
    const hasDiscord = Boolean(ch.discord?.token);
    const hasSlack = Boolean(ch.slack?.botToken);
    const hasSignal = Boolean(ch.signal);
    const hasImessage = Boolean(ch.imessage);
    return hasTelegram || hasWhatsapp || hasDiscord || hasSlack || hasSignal || hasImessage;
  },
};

const testMessageStep: OnboardingStep = {
  id: "test-message",
  title: "First Message Test",
  description:
    "Send a test message through the gateway to verify the full pipeline works end-to-end.",
  required: false,
  async validate(_config) {
    // Cannot be pre-validated without runtime state; always returns false
    // so the consumer can optionally offer it.
    return false;
  },
};

const completionStep: OnboardingStep = {
  id: "done",
  title: "Onboarding Complete",
  description:
    "All required steps are finished. Your Donna agent is ready to use.",
  required: false,
  async validate(_config) {
    // Terminal step — validated by checking all required steps.
    return false;
  },
};

// ---------------------------------------------------------------------------
// Exported step list (ordered)
// ---------------------------------------------------------------------------

/**
 * Canonical ordered list of onboarding steps.
 *
 * Consumers iterate over this list and decide how to present each step.
 * Steps marked `required: false` can be skipped without blocking onboarding
 * completion.
 */
export const onboardingSteps: readonly OnboardingStep[] = [
  configStep,
  gatewayStep,
  channelStep,
  testMessageStep,
  completionStep,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the step definition by id, or undefined. */
export function getStepById(id: string): OnboardingStep | undefined {
  return onboardingSteps.find((s) => s.id === id);
}

/** Return only the required steps. */
export function getRequiredSteps(): OnboardingStep[] {
  return onboardingSteps.filter((s) => s.required);
}

/**
 * Evaluate all steps against the current config snapshot and return a map
 * of step id to completion status.
 */
export async function evaluateSteps(
  config?: DonnaConfig,
): Promise<Map<string, boolean>> {
  const cfg = config ?? (await readConfigFileSnapshot()).config ?? {};
  const result = new Map<string, boolean>();
  for (const step of onboardingSteps) {
    result.set(step.id, await step.validate(cfg as DonnaConfig));
  }
  return result;
}

/**
 * Returns true when all required steps are satisfied according to config.
 */
export async function isOnboardingComplete(
  config?: DonnaConfig,
): Promise<boolean> {
  const status = await evaluateSteps(config);
  return getRequiredSteps().every((s) => status.get(s.id) === true);
}
