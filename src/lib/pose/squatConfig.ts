// FitForm Squat Form Checking & Scoring Configuration
// All biomechanical angle thresholds, timing windows, and penalties in one tunable place.

export const SQUAT_CONFIG = {
  // 1. Angle Thresholds (in degrees)
  STANDING_KNEE_ANGLE_MIN: 158, // Above this is considered upright/standing
  DESCENDING_TRIGGER_ANGLE: 145, // Knee angle dropping below this initiates a squat rep
  SQUAT_DEPTH_KNEE_ANGLE_MAX: 100, // Bottom of squat must reach below ~100 degrees for full depth
  SHALLOW_SQUAT_DEPTH_LIMIT: 135, // Inflection above this is treated as jitter or incomplete descent

  MAX_TORSO_FORWARD_LEAN_DEG: 45, // Torso lean from vertical exceeding ~45 degrees flags "Leaning too far forward"
  MAX_KNEE_PAST_TOE_RATIO: 0.12, // Normalized coordinate delta threshold (only evaluated if visibility is high)

  // 2. Timing Thresholds (in milliseconds)
  MIN_DESCENT_DURATION_MS: 950, // Rep descent faster than ~1 sec is flagged as "Too fast"
  AUTO_FINISH_INACTIVITY_MS: 8000, // Auto-finishes set if user stays still for 8s after logging >= 1 rep
  TARGET_FRAME_INTERVAL_MS: 50, // 20 FPS throttle (1000ms / 20 = 50ms) for light CPU/GPU load

  // 3. Landmark Visibility & Confidence
  MIN_KEYPOINT_VISIBILITY: 0.55, // Minimum confidence for shoulder, hip, knee, ankle
  MIN_FOOT_VISIBILITY_FOR_BALANCE: 0.75, // Stricter confidence to avoid false balance flags

  // 4. Scoring Deductions (Per Rep out of 100)
  DEDUCTIONS: {
    NOT_DEEP_ENOUGH: 25,
    LEANING_TOO_FAR_FORWARD: 20,
    TOO_FAST: 15,
    KNEES_PAST_TOES: 15,
  },

  // 5. User-Facing Feedback Messages
  MESSAGES: {
    CLEAN_FORM: 'Great form! Keep it up.',
    NOT_DEEP_ENOUGH: 'Not deep enough',
    LEANING_FORWARD: 'Leaning too far forward',
    TOO_FAST: 'Too fast — control your descent',
    KNEES_PAST_TOES: 'Knees traveling too far past toes',
    OUT_OF_FRAME: "Step back, we can't see your full body",
    GET_READY: 'Stand side-on to camera to begin',
  },
};
