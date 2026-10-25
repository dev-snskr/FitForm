// FitForm Exercise Database
// Contains exercise metadata, target muscles, and form check support flags.

export interface ExerciseDefinition {
  id: string;
  name: string;
  targetMuscles: string;
  category: 'primary' | 'extra';
  isFormTrackable: boolean; // True for the 5 core exercises supported in Step 3
  isDurationBased?: boolean; // True for exercises like plank (timed in seconds)
  badgeLabel?: string; // e.g. "Form check coming later"
  description: string;
}

export const EXERCISE_REGISTRY: Record<string, ExerciseDefinition> = {
  squat: {
    id: 'squat',
    name: 'Bodyweight Squat',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings',
    category: 'primary',
    isFormTrackable: true,
    description: 'Feet shoulder-width apart, keep back straight and lower hips until thighs are parallel.',
  },
  push_up: {
    id: 'push_up',
    name: 'Push-Up',
    targetMuscles: 'Chest, Triceps, Anterior Deltoids',
    category: 'primary',
    isFormTrackable: true,
    description: 'Keep core tight, body in a straight line, lower chest until elbows bend at 90 degrees.',
  },
  bicep_curl: {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    targetMuscles: 'Biceps Brachii, Forearms',
    category: 'primary',
    isFormTrackable: true,
    description: 'Stand tall with dumbbells, curl weights toward shoulders while keeping elbows stationary.',
  },
  lunge: {
    id: 'lunge',
    name: 'Walking / Static Lunge',
    targetMuscles: 'Quadriceps, Hamstrings, Glutes, Calves',
    category: 'primary',
    isFormTrackable: true,
    description: 'Step forward until both knees are bent at roughly 90 degrees, keeping chest upright.',
  },
  plank: {
    id: 'plank',
    name: 'Forearm Plank',
    targetMuscles: 'Core, Abdominals, Shoulders',
    category: 'primary',
    isFormTrackable: true,
    isDurationBased: true,
    description: 'Forearms on ground, elbows below shoulders, maintain flat spine from head to heels.',
  },
  jumping_jacks: {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    targetMuscles: 'Full Body, Calves, Cardiovascular',
    category: 'extra',
    isFormTrackable: false,
    badgeLabel: 'Form check coming later',
    description: 'Jump feet wide while bringing arms overhead, then return smoothly.',
  },
  glute_bridge: {
    id: 'glute_bridge',
    name: 'Glute Bridge',
    targetMuscles: 'Glutes, Hamstrings, Lower Back',
    category: 'extra',
    isFormTrackable: false,
    badgeLabel: 'Form check coming later',
    description: 'Lie on back with knees bent, squeeze glutes and drive hips towards the ceiling.',
  },
  mountain_climbers: {
    id: 'mountain_climbers',
    name: 'Mountain Climbers',
    targetMuscles: 'Core, Hip Flexors, Shoulders',
    category: 'extra',
    isFormTrackable: false,
    badgeLabel: 'Form check coming later',
    description: 'From high plank position, rapidly drive knees alternately towards chest.',
  },
};
