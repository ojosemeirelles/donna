/**
 * Onboarding progress tracker — persists completed steps to disk.
 *
 * Storage: `~/.donna/onboarding.json`
 *
 * UI-agnostic: both CLI and Desktop can load/save progress and resume
 * from where the user left off.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import { onboardingSteps, getRequiredSteps } from "./steps.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingProgressData {
  /** Step ids that have been completed. */
  completedSteps: string[];
  /** ISO timestamp of the last update. */
  updatedAt: string;
  /** ISO timestamp of when onboarding started. */
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const PROGRESS_FILENAME = "onboarding.json";

function defaultProgress(): OnboardingProgressData {
  const now = new Date().toISOString();
  return {
    completedSteps: [],
    updatedAt: now,
    startedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function resolveProgressPath(env?: NodeJS.ProcessEnv): string {
  const stateDir = resolveStateDir(env ?? process.env);
  return path.join(stateDir, PROGRESS_FILENAME);
}

// ---------------------------------------------------------------------------
// Load / Save
// ---------------------------------------------------------------------------

/**
 * Load saved progress from disk. Returns a fresh default if the file
 * does not exist or is unreadable.
 */
export async function loadProgress(
  env?: NodeJS.ProcessEnv,
): Promise<OnboardingProgressData> {
  const filePath = resolveProgressPath(env);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "completedSteps" in parsed &&
      Array.isArray((parsed as OnboardingProgressData).completedSteps)
    ) {
      return parsed as OnboardingProgressData;
    }
    return defaultProgress();
  } catch {
    return defaultProgress();
  }
}

/**
 * Save progress to disk. Creates the directory if needed.
 */
export async function saveProgress(
  data: OnboardingProgressData,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  const filePath = resolveProgressPath(env);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(
    { ...data, updatedAt: new Date().toISOString() },
    null,
    2,
  );
  await fs.writeFile(filePath, serialized, "utf-8");
}

// ---------------------------------------------------------------------------
// Step completion helpers
// ---------------------------------------------------------------------------

/**
 * Mark a step as completed and persist.
 * Returns the updated progress data.
 */
export async function completeStep(
  stepId: string,
  env?: NodeJS.ProcessEnv,
): Promise<OnboardingProgressData> {
  const progress = await loadProgress(env);
  if (!progress.completedSteps.includes(stepId)) {
    progress.completedSteps.push(stepId);
  }
  await saveProgress(progress, env);
  return progress;
}

/**
 * Mark a step as incomplete (uncomplete) and persist.
 * Returns the updated progress data.
 */
export async function uncompleteStep(
  stepId: string,
  env?: NodeJS.ProcessEnv,
): Promise<OnboardingProgressData> {
  const progress = await loadProgress(env);
  progress.completedSteps = progress.completedSteps.filter((id) => id !== stepId);
  await saveProgress(progress, env);
  return progress;
}

/**
 * Reset all progress (start over).
 */
export async function resetProgress(
  env?: NodeJS.ProcessEnv,
): Promise<OnboardingProgressData> {
  const fresh = defaultProgress();
  await saveProgress(fresh, env);
  return fresh;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Check if a specific step has been completed. */
export function isStepCompleted(
  progress: OnboardingProgressData,
  stepId: string,
): boolean {
  return progress.completedSteps.includes(stepId);
}

/**
 * Get the first step that has not been completed yet.
 * Useful for "resume from where I left off" UX.
 */
export function getNextIncompleteStep(
  progress: OnboardingProgressData,
): string | undefined {
  for (const step of onboardingSteps) {
    if (!progress.completedSteps.includes(step.id)) {
      return step.id;
    }
  }
  return undefined;
}

/**
 * Get the first *required* step that has not been completed yet.
 */
export function getNextRequiredStep(
  progress: OnboardingProgressData,
): string | undefined {
  for (const step of getRequiredSteps()) {
    if (!progress.completedSteps.includes(step.id)) {
      return step.id;
    }
  }
  return undefined;
}

/**
 * Returns true when all required steps are marked as completed
 * in the progress tracker.
 */
export function isProgressComplete(
  progress: OnboardingProgressData,
): boolean {
  const requiredIds = getRequiredSteps().map((s) => s.id);
  return requiredIds.every((id) => progress.completedSteps.includes(id));
}

/**
 * Compute a percentage (0-100) of required steps completed.
 */
export function progressPercent(
  progress: OnboardingProgressData,
): number {
  const required = getRequiredSteps();
  if (required.length === 0) return 100;
  const done = required.filter((s) =>
    progress.completedSteps.includes(s.id),
  ).length;
  return Math.round((done / required.length) * 100);
}
