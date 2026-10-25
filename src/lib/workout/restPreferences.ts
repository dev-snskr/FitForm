// src/lib/workout/restPreferences.ts
// FitForm User Custom Rest Duration Preferences
// Remembers user-adjusted rest periods per exercise and active profile in localStorage.

import { getStoredActiveUserId } from '../profileStorage';

function normalizeExerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getStorageKey(exerciseName: string, userId?: number | null): string {
  const uid = userId ?? getStoredActiveUserId();
  const exKey = normalizeExerciseKey(exerciseName);
  return uid ? `fitform_rest_pref_${uid}_${exKey}` : `fitform_rest_pref_default_${exKey}`;
}

/**
 * Gets user's remembered rest duration for an exercise, or falls back to the plan's recommended rest.
 */
export function getStoredRestPreference(
  exerciseName: string,
  defaultPlanRest: number,
  userId?: number | null
): number {
  if (typeof localStorage === 'undefined') return defaultPlanRest;
  try {
    const raw = localStorage.getItem(getStorageKey(exerciseName, userId));
    if (!raw) return defaultPlanRest;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed <= 0 ? defaultPlanRest : parsed;
  } catch {
    return defaultPlanRest;
  }
}

/**
 * Saves user's preferred rest duration for an exercise.
 */
export function saveStoredRestPreference(
  exerciseName: string,
  restSeconds: number,
  userId?: number | null
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(exerciseName, userId), restSeconds.toString());
  } catch {
    // LocalStorage quota or access error
  }
}

/**
 * Resets user's preference back to the recommended plan default.
 */
export function clearStoredRestPreference(
  exerciseName: string,
  userId?: number | null
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(exerciseName, userId));
  } catch {
    // LocalStorage quota or access error
  }
}
