/**
 * Unified onboarding module — UI-agnostic.
 *
 * Re-exports step definitions and progress tracking so consumers
 * (CLI wizard, Desktop app, web UI) can import from a single entry point.
 */

export {
  type OnboardingStep,
  type StepResult,
  onboardingSteps,
  getStepById,
  getRequiredSteps,
  evaluateSteps,
  isOnboardingComplete,
} from "./steps.js";

export {
  type OnboardingProgressData,
  loadProgress,
  saveProgress,
  completeStep,
  uncompleteStep,
  resetProgress,
  isStepCompleted,
  getNextIncompleteStep,
  getNextRequiredStep,
  isProgressComplete,
  progressPercent,
} from "./progress.js";
