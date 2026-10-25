// src/lib/pose/analyzers/registry.ts
// FitForm Exercise Analyzer Registry & Factory

import { ExerciseId, IExerciseAnalyzer } from '../types';
import { SquatAnalyzer } from './squatAnalyzer';
import { PushUpAnalyzer } from './pushUpAnalyzer';
import { BicepCurlAnalyzer } from './bicepCurlAnalyzer';
import { EXERCISE_CONFIGS } from '../exerciseConfig';

/**
 * Resolves an exercise name or ID string to a supported ExerciseId.
 * Case-insensitive and handles common exercise naming variations.
 */
export function resolveExerciseId(nameOrId: string): ExerciseId | null {
  if (!nameOrId) return null;
  const normalized = nameOrId.trim().toLowerCase();

  if (normalized.includes('squat')) {
    return 'squat';
  }
  if (
    normalized.includes('push-up') ||
    normalized.includes('push up') ||
    normalized.includes('pushup')
  ) {
    return 'push_up';
  }
  if (
    normalized.includes('curl') ||
    normalized.includes('bicep')
  ) {
    return 'bicep_curl';
  }

  return null;
}

/**
 * Returns true if the exercise currently has live camera form checking implemented.
 */
export function isExerciseFormTrackable(nameOrId: string): boolean {
  return resolveExerciseId(nameOrId) !== null;
}

/**
 * Factory that creates a fresh instance of the appropriate exercise analyzer.
 */
export function createExerciseAnalyzer(
  nameOrId: string,
  options?: { arm?: 'left' | 'right' }
): IExerciseAnalyzer | null {
  const exerciseId = resolveExerciseId(nameOrId);
  if (!exerciseId) return null;

  switch (exerciseId) {
    case 'squat':
      return new SquatAnalyzer();
    case 'push_up':
      return new PushUpAnalyzer();
    case 'bicep_curl':
      return new BicepCurlAnalyzer(options?.arm || 'right');
  }
}

/**
 * Gets setup guide instructions for the specified exercise.
 */
export function getExerciseSetupGuide(exerciseId: ExerciseId): string {
  switch (exerciseId) {
    case 'squat':
      return EXERCISE_CONFIGS.squat.MESSAGES.GET_READY;
    case 'push_up':
      return EXERCISE_CONFIGS.push_up.SETUP_GUIDE;
    case 'bicep_curl':
      return EXERCISE_CONFIGS.bicep_curl.SETUP_GUIDE;
  }
}
