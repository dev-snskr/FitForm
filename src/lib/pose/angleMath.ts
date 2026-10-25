// FitForm Pose Geometry & Angle Math Library
// Computes joint angles, torso lean, horizontal displacement, and smoothing filters.

export interface LandmarkPoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z?: number;
  visibility?: number; // 0-1 confidence
}

// MediaPipe Pose Landmark Indices (Standard 33-point model)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * Calculates the interior angle (in degrees) between three points: A -> B -> C
 * where point B is the vertex.
 * Returns angle in degrees [0, 180].
 */
export function calculateAngle(
  a: LandmarkPoint,
  b: LandmarkPoint,
  c: LandmarkPoint
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Calculates the torso lean angle from vertical (in degrees).
 * Measured between the line (hip -> shoulder) and a true vertical line straight up.
 * 0 deg = completely upright; 90 deg = horizontal.
 */
export function calculateTorsoLean(
  shoulder: LandmarkPoint,
  hip: LandmarkPoint
): number {
  // Vector from hip up to shoulder
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y; // note: screen coordinates y increases downwards

  // dy should be negative when shoulder is above hip
  // Angle with true vertical (0, -1)
  const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (angleRad * 180.0) / Math.PI;
}

/**
 * Calculates horizontal forward knee travel past toes (normalized coordinate delta).
 * Returns positive value if knee is forward of the toe in the facing direction.
 */
export function calculateKneeTravelPastToes(
  knee: LandmarkPoint,
  toe: LandmarkPoint,
  facingRight: boolean
): number {
  if (facingRight) {
    return knee.x - toe.x;
  } else {
    return toe.x - knee.x;
  }
}

/**
 * Smooths current landmark points using an Exponential Moving Average (EMA)
 * against previous landmarks to filter high-frequency camera jitter.
 */
export function smoothLandmarks(
  current: LandmarkPoint[],
  previous: LandmarkPoint[] | null,
  alpha = 0.65 // weight of new frame (0 = all previous, 1 = all current)
): LandmarkPoint[] {
  if (!previous || previous.length !== current.length) {
    return current;
  }

  return current.map((curr, idx) => {
    const prev = previous[idx];
    if (!prev) return curr;

    const smoothX = prev.x * (1 - alpha) + curr.x * alpha;
    const smoothY = prev.y * (1 - alpha) + curr.y * alpha;
    const smoothZ =
      prev.z !== undefined && curr.z !== undefined
        ? prev.z * (1 - alpha) + curr.z * alpha
        : curr.z;

    return {
      x: smoothX,
      y: smoothY,
      z: smoothZ,
      visibility: curr.visibility,
    };
  });
}
