// src/lib/voice/phrases.ts
// FitForm Centralized Spoken Phrases & Biomechanical Cues Dictionary
// All voice cues are under 8 words, categorized by exercise and mistake type.

export interface FormCorrectionRule {
  mistakePattern: string; // Matches analyzer mistake string (case-insensitive substring)
  phrase: string;
  priority: number; // Higher number = higher priority
}

export const EXERCISE_VOICE_CORRECTIONS: Record<string, FormCorrectionRule[]> = {
  squat: [
    { mistakePattern: 'out of frame', phrase: 'Step back, full body in view', priority: 100 },
    { mistakePattern: 'knees caved', phrase: 'Push your knees out', priority: 80 },
    { mistakePattern: 'leaning', phrase: 'Keep your chest up', priority: 75 },
    { mistakePattern: 'not deep', phrase: 'Go deeper', priority: 60 },
    { mistakePattern: 'toes', phrase: 'Sit hips back', priority: 50 },
    { mistakePattern: 'too fast', phrase: 'Slow down, control it', priority: 40 },
  ],
  push_up: [
    { mistakePattern: 'out of frame', phrase: 'Step back, whole body in frame', priority: 100 },
    { mistakePattern: 'hips sagging', phrase: 'Hips up, lock your core', priority: 85 },
    { mistakePattern: 'hips too high', phrase: 'Lower hips, straighten your body', priority: 80 },
    { mistakePattern: 'go lower', phrase: 'Go lower, chest to floor', priority: 60 },
    { mistakePattern: 'too fast', phrase: 'Slow down, controlled descent', priority: 40 },
    { mistakePattern: 'hold plank', phrase: 'Hold steady to start', priority: 30 },
  ],
  bicep_curl: [
    { mistakePattern: 'out of frame', phrase: 'Step back into view', priority: 100 },
    { mistakePattern: 'swinging', phrase: "Don't swing, keep elbow still", priority: 85 },
    { mistakePattern: 'pinned', phrase: 'Keep your elbows pinned', priority: 80 },
    { mistakePattern: 'not curling high', phrase: 'Curl higher', priority: 60 },
    { mistakePattern: 'not fully extending', phrase: 'Lower all the way down', priority: 55 },
    { mistakePattern: 'too fast', phrase: 'Slow down the curl', priority: 40 },
  ],
  lunge: [
    { mistakePattern: 'out of frame', phrase: 'Step back, stay in view', priority: 100 },
    { mistakePattern: 'leaning', phrase: 'Keep your torso tall', priority: 80 },
    { mistakePattern: 'not deep', phrase: 'Drop your hips lower', priority: 60 },
    { mistakePattern: 'toes', phrase: 'Take a bigger step forward', priority: 50 },
    { mistakePattern: 'too fast', phrase: 'Slow down your lunge', priority: 40 },
  ],
  plank: [
    { mistakePattern: 'out of frame', phrase: 'Step back, whole body in frame', priority: 100 },
    { mistakePattern: 'hips sagging', phrase: 'Hips up, squeeze glutes', priority: 85 },
    { mistakePattern: 'hips too high', phrase: 'Lower hips, straight line', priority: 80 },
    { mistakePattern: 'head dropping', phrase: 'Head up, neutral neck', priority: 60 },
    { mistakePattern: 'hold plank', phrase: 'Hold steady to start', priority: 30 },
  ],
};

// Positive reinforcement cues (spoken at most once every few clean reps)
export const POSITIVE_CUES = [
  'Great form!',
  'Nice depth!',
  'Solid rep!',
  'Strong work!',
  'Looking good!',
];

// Timed plank milestone announcements
export const PLANK_ANNOUNCEMENTS = {
  TEN_SECONDS_LEFT: 'Ten seconds left, hold strong',
  TARGET_REACHED: 'Target reached! Great hold',
};

// Rest timer voice cues
export const REST_COUNTDOWN_CUES = {
  TEN_SECONDS: 'Ten seconds',
  THREE: 'Three',
  TWO: 'Two',
  ONE: 'One',
  GET_READY: 'Get ready',
};

// Helpful form tips displayed during the rest timer for the upcoming exercise
export const EXERCISE_REST_TIPS: Record<string, string> = {
  squat: 'Drive through your heels, keep your chest upright, and push your knees slightly outward.',
  push_up: 'Keep your elbows tucked at 45 degrees and brace your core so your hips stay level.',
  bicep_curl: 'Pin your elbows firmly to your sides and squeeze hard at the top without swinging.',
  lunge: 'Step forward cleanly, keep your front knee behind your toes, and drop straight down.',
  plank: 'Press your forearms into the floor, squeeze your glutes, and keep a straight line from neck to heels.',
  jumping_jacks: 'Land softly on the balls of your feet and keep a steady, rhythmic pace.',
  glute_bridge: 'Drive through your heels and pause for a 1-second squeeze at the peak of the bridge.',
  mountain_climbers: 'Keep your shoulders directly over your wrists and drive knees forward smoothly.',
};

/**
 * Gets a quick helpful form tip for any exercise.
 */
export function getExerciseTip(exerciseName: string): string {
  const norm = exerciseName.toLowerCase().replace(/[-_]/g, ' ');
  for (const [key, tip] of Object.entries(EXERCISE_REST_TIPS)) {
    const cleanKey = key.replace(/[-_]/g, ' ');
    if (norm.includes(cleanKey)) {
      return tip;
    }
  }
  return 'Focus on slow, controlled repetitions and smooth breathing.';
}

/**
 * Resolves the best short voice phrase for a detected mistake on a specific exercise.
 */
export function getCorrectionPhrase(
  exerciseId: string,
  mistakeText: string
): { phrase: string; priority: number } | null {
  if (!mistakeText) return null;
  const rules = EXERCISE_VOICE_CORRECTIONS[exerciseId] || [];
  const lowerMistake = mistakeText.toLowerCase();

  for (const rule of rules) {
    if (lowerMistake.includes(rule.mistakePattern.toLowerCase())) {
      return { phrase: rule.phrase, priority: rule.priority };
    }
  }

  // Fallback: keep phrase under 8 words if possible
  const words = mistakeText.split(' ').slice(0, 6).join(' ');
  return { phrase: words, priority: 30 };
}
