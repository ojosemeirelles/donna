/**
 * WizardState — pure TypeScript state machine for the 6-step setup wizard.
 *
 * No Electron imports — fully testable without Electron runtime.
 *
 * Steps:
 *   1. welcome      — intro screen
 *   2. provider     — choose LLM provider + enter API key
 *   3. channel      — choose messaging channel (Telegram/WhatsApp/etc.)
 *   4. telegram     — Telegram bot token (shown only if channel=telegram)
 *   5. preferences  — language, port, theme
 *   6. done         — success, open main window
 */

export type WizardStep = "welcome" | "provider" | "channel" | "telegram" | "preferences" | "done";

export const WIZARD_STEPS: WizardStep[] = [
  "welcome",
  "provider",
  "channel",
  "telegram",
  "preferences",
  "done",
];

export type ChannelChoice = "telegram" | "whatsapp" | "discord" | "slack" | "none";

export type LLMProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "openrouter"
  | "ollama"
  | "mistral"
  | "xai";

export type ProviderInfo = {
  id: LLMProvider;
  name: string;
  icon: string;
  keyPrefix: string;
  keyPlaceholder: string;
  keyRequired: boolean;
  keyMinLength: number;
};

export const LLM_PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", name: "Anthropic", icon: "🟠", keyPrefix: "sk-ant-", keyPlaceholder: "sk-ant-api03-...", keyRequired: true, keyMinLength: 20 },
  { id: "openai", name: "OpenAI", icon: "🟢", keyPrefix: "sk-", keyPlaceholder: "sk-proj-...", keyRequired: true, keyMinLength: 20 },
  { id: "google", name: "Google Gemini", icon: "🔵", keyPrefix: "", keyPlaceholder: "AIzaSy...", keyRequired: true, keyMinLength: 10 },
  { id: "openrouter", name: "OpenRouter", icon: "🟣", keyPrefix: "sk-or-", keyPlaceholder: "sk-or-v1-...", keyRequired: true, keyMinLength: 20 },
  { id: "ollama", name: "Ollama (local)", icon: "🦙", keyPrefix: "", keyPlaceholder: "Sem key necessária", keyRequired: false, keyMinLength: 0 },
  { id: "mistral", name: "Mistral", icon: "🌀", keyPrefix: "", keyPlaceholder: "sua-api-key...", keyRequired: true, keyMinLength: 10 },
  { id: "xai", name: "xAI (Grok)", icon: "⚡", keyPrefix: "xai-", keyPlaceholder: "xai-...", keyRequired: true, keyMinLength: 10 },
];

export function getProviderInfo(id: LLMProvider): ProviderInfo {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
}

export type WizardData = {
  provider: LLMProvider;
  apiKey: string;
  channel: ChannelChoice;
  telegramToken: string;
  telegramBotName: string;
  language: "pt" | "en";
  port: number;
  theme: "system" | "light" | "dark";
};

export type WizardState = {
  currentStep: WizardStep;
  stepIndex: number;
  totalSteps: number;
  data: Partial<WizardData>;
  completed: boolean;
  errors: Record<string, string>;
};

/** Returns a fresh initial wizard state at the first step. */
export function createInitialWizardState(): WizardState {
  return {
    currentStep: "welcome",
    stepIndex: 0,
    totalSteps: WIZARD_STEPS.length,
    data: {
      provider: "anthropic",
      language: "pt",
      port: 18789,
      theme: "system",
      channel: "none",
    },
    completed: false,
    errors: {},
  };
}

/** Returns the step index for the given step name. */
export function stepIndexOf(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

/** Returns the next step after the current one, or null if at the last step. */
export function nextStep(current: WizardStep): WizardStep | null {
  const idx = stepIndexOf(current);
  if (idx < 0 || idx >= WIZARD_STEPS.length - 1) {
    return null;
  }
  return WIZARD_STEPS[idx + 1] ?? null;
}

/** Returns the previous step before the current one, or null if at the first step. */
export function prevStep(current: WizardStep): WizardStep | null {
  const idx = stepIndexOf(current);
  if (idx <= 0) {
    return null;
  }
  return WIZARD_STEPS[idx - 1] ?? null;
}

/** Returns true if the wizard can advance from the current step with the given data. */
export function canAdvance(state: WizardState): boolean {
  switch (state.currentStep) {
    case "welcome": {
      return true;
    }
    case "provider": {
      const provider = getProviderInfo(state.data.provider ?? "anthropic");
      if (!provider.keyRequired) {return true;}
      return isValidProviderKey(state.data.apiKey ?? "", state.data.provider ?? "anthropic");
    }
    case "channel": {
      return state.data.channel !== undefined;
    }
    case "telegram": {
      // Skip validation if not using Telegram (token is optional)
      if (state.data.channel !== "telegram") {return true;}
      // If telegram selected, token is optional (can skip)
      const token = state.data.telegramToken?.trim() ?? "";
      return token === "" || isValidTelegramToken(token);
    }
    case "preferences": {
      return (
        state.data.port !== undefined &&
        state.data.port > 0 &&
        state.data.port <= 65535
      );
    }
    case "done": {
      return false; // terminal step
    }
    default: {
      return false;
    }
  }
}

/** Returns true if the API key looks valid for the given provider. */
export function isValidProviderKey(key: string, provider: LLMProvider): boolean {
  const info = getProviderInfo(provider);
  if (!info.keyRequired) {return true;}
  const trimmed = key.trim();
  if (trimmed.length < info.keyMinLength) {return false;}
  if (info.keyPrefix && !trimmed.startsWith(info.keyPrefix)) {return false;}
  return true;
}

/** @deprecated Use isValidProviderKey instead. Kept for backward compat. */
export function isValidApiKey(key: string): boolean {
  return key.trim().length > 10;
}

/** Returns true if the port number is in the valid range (1024-65535). */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

/** Returns true if the Telegram bot token matches the expected format. */
export function isValidTelegramToken(token: string): boolean {
  // Format: {bot_id}:{alphanumeric_hash} — e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  return /^\d{8,}:[A-Za-z0-9_-]{30,}$/.test(token.trim());
}

/**
 * Validates the data for the given step.
 * Returns a map of field → error message (empty map = valid).
 */
export function validateStep(
  step: WizardStep,
  data: Partial<WizardData>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (step) {
    case "provider": {
      const provider = getProviderInfo(data.provider ?? "anthropic");
      if (provider.keyRequired && (!data.apiKey || !isValidProviderKey(data.apiKey, data.provider ?? "anthropic"))) {
        const hint = provider.keyPrefix ? `Deve começar com ${provider.keyPrefix}` : `Mínimo ${provider.keyMinLength} caracteres`;
        errors.apiKey = `API key inválida. ${hint}`;
      }
      break;
    }
    case "channel": {
      if (!data.channel) {
        errors.channel = "Please select a channel";
      }
      break;
    }
    case "telegram": {
      const token = data.telegramToken?.trim() ?? "";
      if (token && !isValidTelegramToken(token)) {
        errors.telegramToken = "Token inválido. Formato: 123456789:ABCdefGHI...";
      }
      break;
    }
    case "preferences": {
      if (data.port !== undefined && !isValidPort(data.port)) {
        errors.port = "Port must be between 1024 and 65535";
      }
      break;
    }
    default: {
      break;
    }
  }

  return errors;
}

/**
 * Advances the wizard to the next step if valid.
 * Returns a new state (immutable update).
 */
export function advanceWizard(state: WizardState): WizardState {
  const errors = validateStep(state.currentStep, state.data);
  if (Object.keys(errors).length > 0) {
    return { ...state, errors };
  }

  let next = nextStep(state.currentStep);
  if (!next) {
    return { ...state, completed: true, errors: {} };
  }

  // Skip telegram step if channel is not telegram
  if (next === "telegram" && state.data.channel !== "telegram") {
    next = nextStep(next);
    if (!next) {
      return { ...state, completed: true, errors: {} };
    }
  }

  const stepIndex = stepIndexOf(next);

  return {
    ...state,
    currentStep: next,
    stepIndex,
    completed: false, // done screen must render before marking completed
    errors: {},
  };
}

/**
 * Goes back to the previous step.
 * Returns a new state (immutable update).
 */
export function goBackWizard(state: WizardState): WizardState {
  let prev = prevStep(state.currentStep);
  if (!prev) {
    return state; // already at first step
  }

  // Skip telegram step if channel is not telegram (mirror advance logic)
  if (prev === "telegram" && state.data.channel !== "telegram") {
    prev = prevStep(prev);
    if (!prev) {
      return state;
    }
  }

  return {
    ...state,
    currentStep: prev,
    stepIndex: stepIndexOf(prev),
    errors: {},
  };
}

/**
 * Updates wizard data with a partial patch.
 * Returns a new state (immutable update).
 */
export function updateWizardData(
  state: WizardState,
  patch: Partial<WizardData>,
): WizardState {
  return {
    ...state,
    data: { ...state.data, ...patch },
    errors: {}, // clear errors on data update
  };
}

/** Returns the progress percentage (0–100). */
export function wizardProgress(state: WizardState): number {
  return Math.round((state.stepIndex / (state.totalSteps - 1)) * 100);
}
