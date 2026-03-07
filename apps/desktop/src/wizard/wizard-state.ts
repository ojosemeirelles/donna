/**
 * WizardState — pure TypeScript state machine for the 5-step setup wizard.
 *
 * No Electron imports — fully testable without Electron runtime.
 *
 * Steps:
 *   1. welcome      — intro screen
 *   2. api-key      — enter Anthropic API key
 *   3. channel      — choose messaging channel (Telegram/WhatsApp/etc.)
 *   4. preferences  — language, port, theme
 *   5. done         — success, open main window
 */

export type WizardStep = "welcome" | "api-key" | "channel" | "preferences" | "done";

export const WIZARD_STEPS: WizardStep[] = [
  "welcome",
  "api-key",
  "channel",
  "preferences",
  "done",
];

export type ChannelChoice = "telegram" | "whatsapp" | "discord" | "slack" | "none";

export type WizardData = {
  apiKey: string;
  channel: ChannelChoice;
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
    case "api-key": {
      return isValidApiKey(state.data.apiKey ?? "");
    }
    case "channel": {
      return state.data.channel !== undefined;
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

/** Returns true if the API key looks valid (starts with "sk-ant-"). */
export function isValidApiKey(key: string): boolean {
  return key.trim().startsWith("sk-ant-") && key.trim().length > 20;
}

/** Returns true if the port number is in the valid range (1024-65535). */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
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
    case "api-key": {
      if (!data.apiKey || !isValidApiKey(data.apiKey)) {
        errors.apiKey = "API key must start with sk-ant- and be at least 20 characters";
      }
      break;
    }
    case "channel": {
      if (!data.channel) {
        errors.channel = "Please select a channel";
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

  const next = nextStep(state.currentStep);
  if (!next) {
    return { ...state, completed: true, errors: {} };
  }

  const stepIndex = stepIndexOf(next);
  const completed = next === "done";

  return {
    ...state,
    currentStep: next,
    stepIndex,
    completed,
    errors: {},
  };
}

/**
 * Goes back to the previous step.
 * Returns a new state (immutable update).
 */
export function goBackWizard(state: WizardState): WizardState {
  const prev = prevStep(state.currentStep);
  if (!prev) {
    return state; // already at first step
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
