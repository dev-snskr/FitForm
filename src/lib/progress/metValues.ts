// src/lib/progress/metValues.ts
// Standard Metabolic Equivalent of Task (MET) reference values for calorie expenditure estimation
// Based on the 2011/2024 Compendium of Physical Activities (Ainsworth et al.)
//
// MET Formula:
// Estimated Calories Burned = MET * bodyWeightKg * (durationMinutes / 60)
//
// Every calorie calculation is explicitly labeled as "estimated" in accordance with clinical exercise guidelines.

export interface ExerciseMetDefinition {
  exerciseKey: string;
  metValue: number;
  description: string;
}

export const EXERCISE_MET_VALUES: Record<string, ExerciseMetDefinition> = {
  squat: {
    exerciseKey: 'squat',
    metValue: 5.5,
    description: 'Calisthenics / resistance squats, vigorous effort (Compendium code 02020)',
  },
  pushup: {
    exerciseKey: 'pushup',
    metValue: 4.5,
    description: 'Calisthenics push-ups, moderate-to-vigorous effort (Compendium code 02022)',
  },
  bicep_curl: {
    exerciseKey: 'bicep_curl',
    metValue: 3.8,
    description: 'Resistance training isolated upper arm movements (Compendium code 02054)',
  },
  lunge: {
    exerciseKey: 'lunge',
    metValue: 5.0,
    description: 'Calisthenics lunges, multi-joint dynamic leg movement (Compendium code 02020)',
  },
  plank: {
    exerciseKey: 'plank',
    metValue: 3.8,
    description: 'Isometric core stability hold, moderate intensity (Compendium code 02040)',
  },
  general_circuit: {
    exerciseKey: 'general_circuit',
    metValue: 4.8,
    description: 'General resistance & calisthenics circuit training (Compendium code 02040)',
  },
};

/**
 * Resolves standard MET for an exercise name.
 */
export function getMetForExercise(exerciseName: string): number {
  const normalized = exerciseName.toLowerCase().replace(/[-_\s]/g, '');
  if (normalized.includes('squat')) return EXERCISE_MET_VALUES.squat.metValue;
  if (normalized.includes('pushup') || normalized.includes('push')) return EXERCISE_MET_VALUES.pushup.metValue;
  if (normalized.includes('curl')) return EXERCISE_MET_VALUES.bicep_curl.metValue;
  if (normalized.includes('lunge')) return EXERCISE_MET_VALUES.lunge.metValue;
  if (normalized.includes('plank')) return EXERCISE_MET_VALUES.plank.metValue;
  return EXERCISE_MET_VALUES.general_circuit.metValue;
}

/**
 * Computes estimated calories burned during a workout session.
 * @param durationMinutes Elapsed workout time in minutes (first to last set plus final rest).
 * @param bodyWeightKg User's current bodyweight in kg.
 * @param averageMet Average MET across exercises performed (default 4.8).
 * @returns Estimated calories burned as integer.
 */
export function calculateEstimatedCalories(
  durationMinutes: number,
  bodyWeightKg: number,
  averageMet = 4.8
): number {
  if (durationMinutes <= 0 || bodyWeightKg <= 0) return 0;
  const hours = durationMinutes / 60;
  return Math.round(averageMet * bodyWeightKg * hours);
}
