// src/lib/pose/exerciseConfig.ts
// FitForm Unified Biomechanical Configuration
// All angle thresholds, timings, penalties, and user messages in one central location.

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
  MIN_KEYPOINT_VISIBILITY: 0.55,
  MIN_FOOT_VISIBILITY_FOR_BALANCE: 0.75,

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

export const PUSH_UP_CONFIG = {
  // 1. Angle Thresholds (in degrees)
  EXTENDED_ELBOW_ANGLE_MIN: 155, // Arms fully extended in plank position
  LOWERING_TRIGGER_ANGLE: 140, // Elbow bending below this initiates lowering phase
  FULL_DEPTH_ELBOW_ANGLE_MAX: 90, // Elbow angle must drop below ~90 degrees for full depth
  SHALLOW_ELBOW_LIMIT: 100, // Elbow failing to reach below 100 degrees flags "Go lower"
  EARLY_INFLECTION_THRESHOLD: 125, // Inflection above this without reaching bottom

  BODY_ALIGNMENT_MIN_ANGLE: 160, // Shoulder-hip-ankle line must stay above ~160 degrees
  PLANK_HORIZONTAL_TOLERANCE_DEG: 45, // Torso angle from horizontal (plank posture)

  // 2. Timing Thresholds (in milliseconds)
  PLANK_READY_HOLD_MS: 1500, // Must hold stable plank for 1.5 seconds before reps start
  MIN_DESCENT_DURATION_MS: 850, // Lowering faster than 850ms flags "Too fast"
  AUTO_FINISH_INACTIVITY_MS: 8000,
  TARGET_FRAME_INTERVAL_MS: 50,

  // 3. Landmark Visibility
  MIN_KEYPOINT_VISIBILITY: 0.55,

  // 4. Scoring Deductions (Per Rep out of 100)
  DEDUCTIONS: {
    GO_LOWER: 25,
    HIPS_SAGGING: 20,
    HIPS_TOO_HIGH: 20,
    TOO_FAST: 15,
  },

  // 5. User-Facing Messages & Setup Guide
  SETUP_GUIDE:
    'Place the camera low, side-on, 2 metres away, so your whole body from head to feet is visible.',
  MESSAGES: {
    HOLD_PLANK: 'Hold plank position for 1.5s to start',
    READY: 'Ready · Lower your body',
    CLEAN_FORM: 'Great push-up! Keep your core tight.',
    GO_LOWER: 'Go lower',
    HIPS_SAGGING: 'Hips sagging',
    HIPS_TOO_HIGH: 'Hips too high',
    TOO_FAST: 'Too fast',
    OUT_OF_FRAME: "Step back, we can't see your full body",
  },
};

export const BICEP_CURL_CONFIG = {
  // 1. Angle Thresholds (in degrees)
  EXTENDED_ARM_ANGLE_MIN: 150, // Arm extended hanging down
  CURL_TRIGGER_ANGLE: 135, // Elbow bending below this initiates concentric curl
  FULLY_CURLED_ANGLE_MAX: 50, // Elbow flexed below ~50 degrees for complete curl
  INCOMPLETE_CURL_LIMIT: 65, // Failing to curl below 65 degrees flags "Not curling high enough"
  INCOMPLETE_EXTENSION_LIMIT: 135, // Starting next rep before reaching 135-150 degrees flags "Not fully extending"

  MAX_TORSO_SWING_DEG: 15, // Torso leaning more than 15 degrees flags "Swinging your body"
  MAX_UPPER_ARM_SWING_DEG: 20, // Upper arm swinging forward/backward more than 20 degrees flags "Swinging your body"

  // 2. Timing Thresholds (in milliseconds)
  MIN_CURL_DURATION_MS: 800, // Concentric phase faster than 800ms flags "Too fast"
  AUTO_FINISH_INACTIVITY_MS: 8000,
  TARGET_FRAME_INTERVAL_MS: 50,

  // 3. Landmark Visibility
  MIN_KEYPOINT_VISIBILITY: 0.55,

  // 4. Scoring Deductions (Per Rep out of 100)
  DEDUCTIONS: {
    SWINGING_BODY: 20,
    NOT_CURLING_HIGH_ENOUGH: 25,
    NOT_FULLY_EXTENDING: 20,
    TOO_FAST: 15,
  },

  // 5. User-Facing Messages & Setup Guide
  SETUP_GUIDE:
    'Stand side-on with your tracked arm facing the camera and your whole upper body in view.',
  MESSAGES: {
    READY: 'Ready · Begin curl',
    CLEAN_FORM: 'Controlled curl! Great form.',
    SWINGING_BODY: 'Swinging your body',
    NOT_CURLING_HIGH_ENOUGH: 'Not curling high enough',
    NOT_FULLY_EXTENDING: 'Not fully extending',
    TOO_FAST: 'Too fast',
    OUT_OF_FRAME: "Step back, we can't see your tracked arm and upper body",
  },
};

export const EXERCISE_CONFIGS = {
  squat: SQUAT_CONFIG,
  push_up: PUSH_UP_CONFIG,
  bicep_curl: BICEP_CURL_CONFIG,
};
