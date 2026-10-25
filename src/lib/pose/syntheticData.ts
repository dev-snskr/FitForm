// src/lib/pose/syntheticData.ts
// FitForm Synthetic Pose Sequence Generator
// Generates realistic landmark frames for unit tests and the developer pose simulation page.

import { LandmarkPoint, POSE_LANDMARKS } from './angleMath';
import { ExerciseId } from './types';

export interface SyntheticFrame {
  timestamp: number;
  landmarks: LandmarkPoint[];
  description?: string;
}

export interface SyntheticScenario {
  id: string;
  name: string;
  exerciseId: ExerciseId;
  description: string;
  expectedReps: number;
  expectedMistakes: string[];
  expectedMinScore: number;
  expectedMaxScore: number;
  frames: SyntheticFrame[];
}

/**
 * Creates a base 33-landmark skeleton in a standard side-view standing posture (Squat).
 */
export function createBaseSkeleton(
  kneeAngleDeg: number = 175,
  torsoLeanDeg: number = 8,
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  const L1 = 0.25;
  const L2 = 0.25;
  const L3 = 0.28;

  const ankleX = 0.5;
  const ankleY = 0.82;

  const kneeBend = Math.max(0, 180 - kneeAngleDeg);
  const shinTiltDeg = 10 + (kneeBend / 90) * 12;
  const shinTiltRad = (shinTiltDeg * Math.PI) / 180;

  const kneeX = ankleX + L1 * Math.sin(shinTiltRad);
  const kneeY = ankleY - L1 * Math.cos(shinTiltRad);

  const angleKA = Math.atan2(ankleY - kneeY, ankleX - kneeX);
  const angleKH = angleKA + (kneeAngleDeg * Math.PI) / 180;

  const hipX = kneeX + L2 * Math.cos(angleKH);
  const hipY = kneeY + L2 * Math.sin(angleKH);

  const torsoRad = (torsoLeanDeg * Math.PI) / 180;
  const shoulderX = hipX + L3 * Math.sin(torsoRad);
  const shoulderY = hipY - L3 * Math.cos(torsoRad);

  const toeX = ankleX + 0.12;
  const toeY = ankleY + 0.02;
  const noseX = shoulderX + 0.04;
  const noseY = shoulderY - 0.08;

  points[POSE_LANDMARKS.RIGHT_ANKLE] = { x: ankleX, y: ankleY, visibility };
  points[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = { x: toeX, y: toeY, visibility };
  points[POSE_LANDMARKS.RIGHT_KNEE] = { x: kneeX, y: kneeY, visibility };
  points[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX, y: hipY, visibility };
  points[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility };
  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  points[POSE_LANDMARKS.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_FOOT_INDEX] = { x: toeX, y: toeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_HIP] = { x: hipX, y: hipY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: visibility * 0.4 };

  return points;
}

/**
 * Creates a base 33-landmark skeleton in a side-view prone push-up position.
 */
export function createPushUpSkeleton(
  elbowAngleDeg: number = 165,
  hipSagOffset: number = 0, // >0 sags toward floor, <0 pikes toward ceiling
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  const wristX = 0.28;
  const wristY = 0.76;
  const ankleX = 0.82;
  const ankleY = 0.76;

  // Forearm & Upper arm lengths
  const L1 = 0.16;
  const L2 = 0.16;

  // Forearm orientation: tilted slightly back from wrist
  const forearmAngleRad = (80 * Math.PI) / 180;
  const elbowX = wristX - L1 * Math.cos(forearmAngleRad);
  const elbowY = wristY - L1 * Math.sin(forearmAngleRad);

  // Exact angle at elbow vertex
  // Vector E -> W angle
  const angleEW = Math.atan2(wristY - elbowY, wristX - elbowX);
  // Vector E -> S angle = angleEW - elbowAngleDeg
  const angleES = angleEW - (elbowAngleDeg * Math.PI) / 180;

  const shoulderX = elbowX + L2 * Math.cos(angleES);
  const shoulderY = elbowY + L2 * Math.sin(angleES);

  // Straight line from shoulder to ankle
  const dxSA = ankleX - shoulderX;
  const dySA = ankleY - shoulderY;
  const lenSA = Math.hypot(dxSA, dySA);
  const ux = dxSA / lenSA;
  const uy = dySA / lenSA;

  // Perpendicular unit vector pointing down toward floor
  const nx = -uy;
  const ny = ux;

  // Hip at 45% along line
  const hipX = shoulderX + 0.45 * dxSA + hipSagOffset * nx;
  const hipY = shoulderY + 0.45 * dySA + hipSagOffset * ny;

  // Knee at 72% along line
  const kneeX = shoulderX + 0.72 * dxSA + (hipSagOffset * 0.5) * nx;
  const kneeY = shoulderY + 0.72 * dySA + (hipSagOffset * 0.5) * ny;

  const noseX = shoulderX - 0.08;
  const noseY = shoulderY - 0.04;

  // Right side (primary side facing camera)
  points[POSE_LANDMARKS.RIGHT_WRIST] = { x: wristX, y: wristY, visibility };
  points[POSE_LANDMARKS.RIGHT_ELBOW] = { x: elbowX, y: elbowY, visibility };
  points[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility };
  points[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX, y: hipY, visibility };
  points[POSE_LANDMARKS.RIGHT_KNEE] = { x: kneeX, y: kneeY, visibility };
  points[POSE_LANDMARKS.RIGHT_ANKLE] = { x: ankleX, y: ankleY, visibility };
  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  // Left side
  points[POSE_LANDMARKS.LEFT_WRIST] = { x: wristX, y: wristY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_ELBOW] = { x: elbowX, y: elbowY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_HIP] = { x: hipX, y: hipY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: visibility * 0.4 };

  return points;
}

/**
 * Creates a base 33-landmark skeleton in a standing bicep curl posture (right arm).
 */
export function createBicepCurlSkeleton(
  elbowAngleDeg: number = 165,
  torsoLeanDeg: number = 4,
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  const hipX = 0.48;
  const hipY = 0.52;
  const kneeX = 0.48;
  const kneeY = 0.70;
  const ankleX = 0.48;
  const ankleY = 0.88;

  // Torso position
  const torsoRad = (torsoLeanDeg * Math.PI) / 180;
  const shoulderX = hipX + 0.26 * Math.sin(torsoRad);
  const shoulderY = hipY - 0.26 * Math.cos(torsoRad);

  // Upper arm hangs from shoulder
  const L_upper = 0.16;
  const L_forearm = 0.15;
  const elbowX = shoulderX + 0.01;
  const elbowY = shoulderY + L_upper;

  // Exact angle at elbow vertex
  // Vector E -> S angle
  const angleES = Math.atan2(shoulderY - elbowY, shoulderX - elbowX);
  // Vector E -> W angle = angleES + elbowAngleDeg
  const angleEW = angleES + (elbowAngleDeg * Math.PI) / 180;

  const wristX = elbowX + L_forearm * Math.cos(angleEW);
  const wristY = elbowY + L_forearm * Math.sin(angleEW);

  const noseX = shoulderX + 0.04;
  const noseY = shoulderY - 0.08;

  // Right side
  points[POSE_LANDMARKS.RIGHT_ANKLE] = { x: ankleX, y: ankleY, visibility };
  points[POSE_LANDMARKS.RIGHT_KNEE] = { x: kneeX, y: kneeY, visibility };
  points[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX, y: hipY, visibility };
  points[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility };
  points[POSE_LANDMARKS.RIGHT_ELBOW] = { x: elbowX, y: elbowY, visibility };
  points[POSE_LANDMARKS.RIGHT_WRIST] = { x: wristX, y: wristY, visibility };
  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  // Left side
  points[POSE_LANDMARKS.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_HIP] = { x: hipX, y: hipY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_ELBOW] = { x: elbowX, y: elbowY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_WRIST] = { x: wristX, y: wristY, visibility: visibility * 0.4 };

  return points;
}

/**
 * Creates a base 33-landmark skeleton in a lunge posture.
 * Facing right (+X). Right leg is in front by default (higher ankle.x).
 */
export function createLungeSkeleton(
  frontKneeAngleDeg: number = 170,
  torsoLeanDeg: number = 8,
  kneePastToeDelta: number = 0,
  isRightFront: boolean = true,
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  const L1 = 0.22; // shin
  const L2 = 0.23; // thigh
  const L3 = 0.28; // torso

  // Front ankle & toe
  const frontAnkleX = 0.62;
  const frontAnkleY = 0.82;
  const frontToeX = 0.72;
  const frontToeY = 0.84;

  // Front knee position based on knee flexion
  const kneeBend = Math.max(0, 180 - frontKneeAngleDeg);
  const shinTiltDeg = 6 + (kneeBend / 90) * 12;
  const shinTiltRad = (shinTiltDeg * Math.PI) / 180;

  const frontKneeX = frontAnkleX + L1 * Math.sin(shinTiltRad) + kneePastToeDelta;
  const frontKneeY = frontAnkleY - L1 * Math.cos(shinTiltRad);

  // Exact angle at knee vertex: angle between K->A and K->H
  const angleKA = Math.atan2(frontAnkleY - frontKneeY, frontAnkleX - frontKneeX);
  const angleKH = angleKA + (frontKneeAngleDeg * Math.PI) / 180;

  const frontHipX = frontKneeX + L2 * Math.cos(angleKH);
  const frontHipY = frontKneeY + L2 * Math.sin(angleKH);

  // Torso position
  const torsoRad = (torsoLeanDeg * Math.PI) / 180;
  const shoulderX = frontHipX + L3 * Math.sin(torsoRad);
  const shoulderY = frontHipY - L3 * Math.cos(torsoRad);

  // Back leg
  const backAnkleX = frontHipX - 0.28;
  const backAnkleY = 0.82;
  const backToeX = backAnkleX + 0.08;
  const backToeY = 0.84;
  const backKneeX = frontHipX - 0.16;
  const backKneeY = Math.min(0.80, frontHipY + 0.20);

  const noseX = shoulderX + 0.05;
  const noseY = shoulderY - 0.08;

  // Assign according to isRightFront
  const fAnkle = { x: frontAnkleX, y: frontAnkleY, visibility };
  const fToe = { x: frontToeX, y: frontToeY, visibility };
  const fKnee = { x: frontKneeX, y: frontKneeY, visibility };
  const fHip = { x: frontHipX, y: frontHipY, visibility };

  const bAnkle = { x: backAnkleX, y: backAnkleY, visibility: visibility * 0.8 };
  const bToe = { x: backToeX, y: backToeY, visibility: visibility * 0.8 };
  const bKnee = { x: backKneeX, y: backKneeY, visibility: visibility * 0.8 };
  const bHip = { x: frontHipX, y: frontHipY, visibility: visibility * 0.8 };

  const rShoulder = { x: shoulderX, y: shoulderY, visibility };
  const lShoulder = { x: shoulderX, y: shoulderY, visibility: visibility * 0.8 };

  if (isRightFront) {
    points[POSE_LANDMARKS.RIGHT_ANKLE] = fAnkle;
    points[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = fToe;
    points[POSE_LANDMARKS.RIGHT_KNEE] = fKnee;
    points[POSE_LANDMARKS.RIGHT_HIP] = fHip;
    points[POSE_LANDMARKS.RIGHT_SHOULDER] = rShoulder;

    points[POSE_LANDMARKS.LEFT_ANKLE] = bAnkle;
    points[POSE_LANDMARKS.LEFT_FOOT_INDEX] = bToe;
    points[POSE_LANDMARKS.LEFT_KNEE] = bKnee;
    points[POSE_LANDMARKS.LEFT_HIP] = bHip;
    points[POSE_LANDMARKS.LEFT_SHOULDER] = lShoulder;
  } else {
    points[POSE_LANDMARKS.LEFT_ANKLE] = fAnkle;
    points[POSE_LANDMARKS.LEFT_FOOT_INDEX] = fToe;
    points[POSE_LANDMARKS.LEFT_KNEE] = fKnee;
    points[POSE_LANDMARKS.LEFT_HIP] = fHip;
    points[POSE_LANDMARKS.LEFT_SHOULDER] = rShoulder;

    points[POSE_LANDMARKS.RIGHT_ANKLE] = bAnkle;
    points[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = bToe;
    points[POSE_LANDMARKS.RIGHT_KNEE] = bKnee;
    points[POSE_LANDMARKS.RIGHT_HIP] = bHip;
    points[POSE_LANDMARKS.RIGHT_SHOULDER] = lShoulder;
  }

  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  return points;
}

/**
 * Creates a base 33-landmark skeleton in a forearm plank hold position.
 * Facing left (-X). Head/shoulder at left, toes at right.
 */
export function createPlankSkeleton(
  hipSagOffset: number = 0,
  headDropOffset: number = 0,
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  const elbowX = 0.28;
  const elbowY = 0.78;
  const wristX = 0.18;
  const wristY = 0.78;

  const shoulderX = 0.28;
  const shoulderY = 0.58;

  const ankleX = 0.82;
  const ankleY = 0.76;
  const toeX = 0.86;
  const toeY = 0.78;

  // Midline between shoulder and ankle
  const hipBaseX = 0.55;
  const hipBaseY = shoulderY + (ankleY - shoulderY) * 0.5; // ~0.67

  const hipX = hipBaseX;
  const hipY = hipBaseY + hipSagOffset;

  const kneeX = 0.68;
  const kneeY = (hipY + ankleY) / 2;

  const noseX = shoulderX - 0.08;
  const noseY = shoulderY - 0.02 + headDropOffset;

  // Active right side
  points[POSE_LANDMARKS.RIGHT_WRIST] = { x: wristX, y: wristY, visibility };
  points[POSE_LANDMARKS.RIGHT_ELBOW] = { x: elbowX, y: elbowY, visibility };
  points[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility };
  points[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX, y: hipY, visibility };
  points[POSE_LANDMARKS.RIGHT_KNEE] = { x: kneeX, y: kneeY, visibility };
  points[POSE_LANDMARKS.RIGHT_ANKLE] = { x: ankleX, y: ankleY, visibility };
  points[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = { x: toeX, y: toeY, visibility };

  // Passive left side
  points[POSE_LANDMARKS.LEFT_WRIST] = { x: wristX, y: wristY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_ELBOW] = { x: elbowX, y: elbowY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_HIP] = { x: hipX, y: hipY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_FOOT_INDEX] = { x: toeX, y: toeY, visibility: visibility * 0.4 };

  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  return points;
}


// ============================================================================
// SQUAT SCENARIOS
// ============================================================================

export function generatePerfectSquatScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 15; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8), description: 'Standing tall' });
    t += 50;
  }
  for (let i = 0; i < 28; i++) {
    const angle = 175 - (i / 27) * (175 - 88);
    const lean = 8 + (i / 27) * 16;
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean), description: 'Controlled descent' });
    t += 50;
  }
  for (let i = 0; i < 8; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(88, 24), description: 'Parallel depth' });
    t += 50;
  }
  for (let i = 0; i < 26; i++) {
    const angle = 88 + (i / 25) * (175 - 88);
    const lean = 24 - (i / 25) * 16;
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean), description: 'Ascending' });
    t += 50;
  }
  for (let i = 0; i < 15; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8), description: 'Standing completed' });
    t += 50;
  }

  return {
    id: 'squat_perfect',
    name: 'Squat: Perfect Rep',
    exerciseId: 'squat',
    description: 'Smooth descent to 88°, torso under 25°, 1.4s tempo. Expects 1 rep, score 100.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generateShallowSquatScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }
  for (let i = 0; i < 20; i++) {
    const angle = 175 - (i / 19) * (175 - 118);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 14) });
    t += 50;
  }
  for (let i = 0; i < 18; i++) {
    const angle = 118 + (i / 17) * (175 - 118);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 10) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'squat_shallow',
    name: 'Squat: Shallow Descent',
    exerciseId: 'squat',
    description: 'Lowest knee angle 118° (misses 100°). Flags "Not deep enough", score 75.',
    expectedReps: 1,
    expectedMistakes: ['Not deep enough'],
    expectedMinScore: 75,
    expectedMaxScore: 75,
    frames,
  };
}

export function generateExcessiveLeanScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }
  for (let i = 0; i < 28; i++) {
    const angle = 175 - (i / 27) * (175 - 88);
    const lean = 8 + (i / 27) * 44; // leans to 52° (>45°)
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean) });
    t += 50;
  }
  for (let i = 0; i < 26; i++) {
    const angle = 88 + (i / 25) * (175 - 88);
    const lean = 52 - (i / 25) * 44;
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'squat_excessive_lean',
    name: 'Squat: Excessive Forward Lean',
    exerciseId: 'squat',
    description: 'Torso lean reaches 52° (>45° limit). Flags "Leaning too far forward", score 80.',
    expectedReps: 1,
    expectedMistakes: ['Leaning too far forward'],
    expectedMinScore: 80,
    expectedMaxScore: 80,
    frames,
  };
}

export function generateFastDescentScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }
  // Fast 400ms descent (<950ms)
  for (let i = 0; i < 8; i++) {
    const angle = 175 - (i / 7) * (175 - 88);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 16) });
    t += 50;
  }
  for (let i = 0; i < 25; i++) {
    const angle = 88 + (i / 24) * (175 - 88);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 10) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'squat_fast_descent',
    name: 'Squat: Too Fast Descent',
    exerciseId: 'squat',
    description: 'Descent completes in 400ms. Flags "Too fast — control your descent", score 85.',
    expectedReps: 1,
    expectedMistakes: ['Too fast — control your descent'],
    expectedMinScore: 85,
    expectedMaxScore: 85,
    frames,
  };
}

// ============================================================================
// PUSH-UP SCENARIOS
// ============================================================================

export function generatePerfectPushUpScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Plank hold for 1.6s (32 frames * 50ms = 1600ms) with arms extended & straight line
  for (let i = 0; i < 33; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPushUpSkeleton(165, 0),
      description: 'Holding stable plank (1.5s ready check)',
    });
    t += 50;
  }

  // 2. Lowering phase down to 85° (<90°) over 1.2s (24 frames)
  for (let i = 0; i < 25; i++) {
    const angle = 165 - (i / 24) * (165 - 85);
    frames.push({
      timestamp: t,
      landmarks: createPushUpSkeleton(angle, 0),
      description: 'Controlled lowering',
    });
    t += 50;
  }

  // 3. Pause at bottom
  for (let i = 0; i < 6; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPushUpSkeleton(85, 0),
      description: 'Bottom of push-up (<90°)',
    });
    t += 50;
  }

  // 4. Pushing up phase back to 165° over 1.1s (22 frames)
  for (let i = 0; i < 23; i++) {
    const angle = 85 + (i / 22) * (165 - 85);
    frames.push({
      timestamp: t,
      landmarks: createPushUpSkeleton(angle, 0),
      description: 'Pushing up to plank',
    });
    t += 50;
  }

  // 5. Finished rep hold
  for (let i = 0; i < 10; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPushUpSkeleton(165, 0),
      description: 'Rep complete',
    });
    t += 50;
  }

  return {
    id: 'pushup_perfect',
    name: 'Push-Up: Perfect Rep',
    exerciseId: 'push_up',
    description: '1.5s plank hold, lowering to 85°, straight alignment. Expects 1 rep, score 100.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generateShallowPushUpScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Plank hold
  for (let i = 0; i < 33; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  // 2. Shallow lowering: only reaches 110° (never drops below 100°)
  for (let i = 0; i < 20; i++) {
    const angle = 165 - (i / 19) * (165 - 110);
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, 0) });
    t += 50;
  }

  // 3. Ascends back early
  for (let i = 0; i < 20; i++) {
    const angle = 110 + (i / 19) * (165 - 110);
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, 0) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  return {
    id: 'pushup_shallow',
    name: 'Push-Up: Shallow Rep',
    exerciseId: 'push_up',
    description: 'Elbow only bends to 110° (above 100°). Flags "Go lower", score 75.',
    expectedReps: 1,
    expectedMistakes: ['Go lower'],
    expectedMinScore: 75,
    expectedMaxScore: 75,
    frames,
  };
}

export function generateSaggingHipsPushUpScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Plank hold
  for (let i = 0; i < 33; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  // 2. Lowering with sagging hips (offset +0.06 downward)
  for (let i = 0; i < 24; i++) {
    const angle = 165 - (i / 23) * (165 - 85);
    const sag = (i / 23) * 0.07;
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, sag) });
    t += 50;
  }

  // 3. Pushing up with sagging hips
  for (let i = 0; i < 24; i++) {
    const angle = 85 + (i / 23) * (165 - 85);
    const sag = 0.07 - (i / 23) * 0.04;
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, sag) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  return {
    id: 'pushup_sagging_hips',
    name: 'Push-Up: Sagging Hips',
    exerciseId: 'push_up',
    description: 'Hips sag toward floor (alignment angle drops under 160°). Flags "Hips sagging", score 80.',
    expectedReps: 1,
    expectedMistakes: ['Hips sagging'],
    expectedMinScore: 80,
    expectedMaxScore: 80,
    frames,
  };
}

export function generateFastPushUpScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Plank hold
  for (let i = 0; i < 33; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  // 2. Lowering in 400ms (<850ms)
  for (let i = 0; i < 8; i++) {
    const angle = 165 - (i / 7) * (165 - 85);
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, 0) });
    t += 50;
  }

  // 3. Ascends
  for (let i = 0; i < 20; i++) {
    const angle = 85 + (i / 19) * (165 - 85);
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(angle, 0) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createPushUpSkeleton(165, 0) });
    t += 50;
  }

  return {
    id: 'pushup_fast',
    name: 'Push-Up: Too Fast',
    exerciseId: 'push_up',
    description: 'Lowering completes in 400ms (<850ms). Flags "Too fast", score 85.',
    expectedReps: 1,
    expectedMistakes: ['Too fast'],
    expectedMinScore: 85,
    expectedMaxScore: 85,
    frames,
  };
}

// ============================================================================
// BICEP CURL SCENARIOS
// ============================================================================

export function generatePerfectBicepCurlScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Standing extended
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4), description: 'Arm extended' });
    t += 50;
  }

  // 2. Concentric curl to 42° (<50°) over 1.2s (24 frames)
  for (let i = 0; i < 25; i++) {
    const angle = 165 - (i / 24) * (165 - 42);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4), description: 'Curling upward' });
    t += 50;
  }

  // 3. Pause at top
  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(42, 4), description: 'Peak contraction (<50°)' });
    t += 50;
  }

  // 4. Eccentric lowering to 165° over 1.2s
  for (let i = 0; i < 25; i++) {
    const angle = 42 + (i / 24) * (165 - 42);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4), description: 'Lowering weight' });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4), description: 'Rep completed' });
    t += 50;
  }

  return {
    id: 'bicep_perfect',
    name: 'Bicep Curl: Perfect Rep',
    exerciseId: 'bicep_curl',
    description: 'Controlled curl from 165° to 42° with quiet torso (<15°). Expects 1 rep, score 100.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generateSwingingBicepCurlScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  // Torso swings back to 22° (>15°)
  for (let i = 0; i < 24; i++) {
    const angle = 165 - (i / 23) * (165 - 42);
    const lean = 4 + (i / 23) * 18; // 22 deg
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, lean) });
    t += 50;
  }

  for (let i = 0; i < 24; i++) {
    const angle = 42 + (i / 23) * (165 - 42);
    const lean = 22 - (i / 23) * 18;
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, lean) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  return {
    id: 'bicep_swinging',
    name: 'Bicep Curl: Swinging Body',
    exerciseId: 'bicep_curl',
    description: 'Torso swings to 22° (>15° limit). Flags "Swinging your body", score 80.',
    expectedReps: 1,
    expectedMistakes: ['Swinging your body'],
    expectedMinScore: 80,
    expectedMaxScore: 80,
    frames,
  };
}

export function generateHalfBicepCurlScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  // Only curls to 80° (misses 65°)
  for (let i = 0; i < 20; i++) {
    const angle = 165 - (i / 19) * (165 - 80);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4) });
    t += 50;
  }

  for (let i = 0; i < 20; i++) {
    const angle = 80 + (i / 19) * (165 - 80);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  return {
    id: 'bicep_half',
    name: 'Bicep Curl: Half Curl',
    exerciseId: 'bicep_curl',
    description: 'Arm curls only to 80° (fails <65°). Flags "Not curling high enough", score 75.',
    expectedReps: 1,
    expectedMistakes: ['Not curling high enough'],
    expectedMinScore: 75,
    expectedMaxScore: 75,
    frames,
  };
}

export function generateFastBicepCurlScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  // Concentric in 350ms (<800ms)
  for (let i = 0; i < 7; i++) {
    const angle = 165 - (i / 6) * (165 - 42);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4) });
    t += 50;
  }

  for (let i = 0; i < 20; i++) {
    const angle = 42 + (i / 19) * (165 - 42);
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(angle, 4) });
    t += 50;
  }

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createBicepCurlSkeleton(165, 4) });
    t += 50;
  }

  return {
    id: 'bicep_fast',
    name: 'Bicep Curl: Too Fast',
    exerciseId: 'bicep_curl',
    description: 'Concentric curl in 350ms (<800ms). Flags "Too fast", score 85.',
    expectedReps: 1,
    expectedMistakes: ['Too fast'],
    expectedMinScore: 85,
    expectedMaxScore: 85,
    frames,
  };
}

// ============================================================================
// EDGE CASE SCENARIOS
// ============================================================================

export function generateJitterScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 40; i++) {
    const noise = (Math.sin(i * 1.5) + Math.cos(i * 0.7)) * 1.2;
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175 + noise, 8),
      description: 'Standing still with camera jitter',
    });
    t += 50;
  }

  return {
    id: 'jitter',
    name: 'Edge: Standing Still with Camera Jitter',
    exerciseId: 'squat',
    description: 'Small noise vibrations around 175° knee angle. Must stay at 0 reps.',
    expectedReps: 0,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generateOutOfFrameScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 20; i++) {
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175, 8, 0.2), // low confidence
      description: 'Body partially obscured or too close',
    });
    t += 50;
  }

  return {
    id: 'out_of_frame',
    name: 'Edge: Body Out of Frame / Too Close',
    exerciseId: 'squat',
    description: 'Low landmark visibility. Triggers "Step back, we can\'t see your full body".',
    expectedReps: 0,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

// ============================================================================
// LUNGE SCENARIOS
// ============================================================================

export function generatePerfectLungeScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Standing preparation (10 frames)
  for (let i = 0; i < 10; i++) {
    frames.push({
      timestamp: t,
      landmarks: createLungeSkeleton(170, 8),
      description: 'Standing ready',
    });
    t += 50;
  }

  // 2. Descent: knee bends to 88° (>1000ms duration, lean 12°)
  for (let i = 0; i < 26; i++) {
    const angle = 170 - (i / 25) * (170 - 88);
    const lean = 8 + (i / 25) * 4;
    frames.push({
      timestamp: t,
      landmarks: createLungeSkeleton(angle, lean),
      description: 'Descending smoothly',
    });
    t += 50;
  }

  // 3. Bottom hold (8 frames)
  for (let i = 0; i < 8; i++) {
    frames.push({
      timestamp: t,
      landmarks: createLungeSkeleton(88, 12),
      description: 'Bottom position (<100°)',
    });
    t += 50;
  }

  // 4. Ascent back to standing (24 frames)
  for (let i = 0; i < 24; i++) {
    const angle = 88 + (i / 23) * (170 - 88);
    const lean = 12 - (i / 23) * 4;
    frames.push({
      timestamp: t,
      landmarks: createLungeSkeleton(angle, lean),
      description: 'Ascending',
    });
    t += 50;
  }

  // 5. Standing completed
  for (let i = 0; i < 10; i++) {
    frames.push({
      timestamp: t,
      landmarks: createLungeSkeleton(170, 8),
      description: 'Standing complete',
    });
    t += 50;
  }

  return {
    id: 'lunge_perfect',
    name: 'Lunge: Perfect Rep',
    exerciseId: 'lunge',
    description: 'Front knee bends to 88°, upright torso (12°), controlled tempo (1.3s). 1 rep, score 100.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generateShallowLungeScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }
  // Descent only reaches 118° (does not reach 100°)
  for (let i = 0; i < 20; i++) {
    const angle = 170 - (i / 19) * (170 - 118);
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, 10) });
    t += 50;
  }
  for (let i = 0; i < 18; i++) {
    const angle = 118 + (i / 17) * (170 - 118);
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, 8) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }

  return {
    id: 'lunge_shallow',
    name: 'Lunge: Shallow Descent',
    exerciseId: 'lunge',
    description: 'Knee only reaches 118°. Flags "Not deep enough", score 75.',
    expectedReps: 1,
    expectedMistakes: ['Not deep enough'],
    expectedMinScore: 75,
    expectedMaxScore: 75,
    frames,
  };
}

export function generateForwardLeanLungeScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }
  // Torso leans to 34° (> 25°)
  for (let i = 0; i < 26; i++) {
    const angle = 170 - (i / 25) * (170 - 88);
    const lean = 8 + (i / 25) * 26;
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, lean) });
    t += 50;
  }
  for (let i = 0; i < 8; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(88, 34) });
    t += 50;
  }
  for (let i = 0; i < 24; i++) {
    const angle = 88 + (i / 23) * (170 - 88);
    const lean = 34 - (i / 23) * 26;
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, lean) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }

  return {
    id: 'lunge_lean',
    name: 'Lunge: Leaning Too Far Forward',
    exerciseId: 'lunge',
    description: 'Torso leans forward to 34° (>25°). Flags "Leaning too far forward", score 80.',
    expectedReps: 1,
    expectedMistakes: ['Leaning too far forward'],
    expectedMinScore: 80,
    expectedMaxScore: 80,
    frames,
  };
}

export function generateFastLungeScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }
  // Drops in 300ms (6 frames @ 50ms)
  for (let i = 0; i < 6; i++) {
    const angle = 170 - (i / 5) * (170 - 88);
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, 10) });
    t += 50;
  }
  for (let i = 0; i < 2; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(88, 10) });
    t += 50;
  }
  for (let i = 0; i < 6; i++) {
    const angle = 88 + (i / 5) * (170 - 88);
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(angle, 8) });
    t += 50;
  }
  for (let i = 0; i < 10; i++) {
    frames.push({ timestamp: t, landmarks: createLungeSkeleton(170, 8) });
    t += 50;
  }

  return {
    id: 'lunge_fast',
    name: 'Lunge: Too Fast',
    exerciseId: 'lunge',
    description: 'Descent completes in 300ms (<850ms). Flags "Too fast", score 85.',
    expectedReps: 1,
    expectedMistakes: ['Too fast'],
    expectedMinScore: 85,
    expectedMaxScore: 85,
    frames,
  };
}

// ============================================================================
// PLANK SCENARIOS
// ============================================================================

export function generatePlankWellHeldScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Initial 2.2s stable hold (44 frames @ 50ms = 2200ms)
  for (let i = 0; i < 44; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPlankSkeleton(0, 0),
      description: 'Holding plank to start timer (2.0s required)',
    });
    t += 50;
  }

  // 2. 5 seconds of active hold with good form (100 frames @ 50ms = 5000ms)
  for (let i = 0; i < 100; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPlankSkeleton(0, 0),
      description: 'Active timed hold (perfect form)',
    });
    t += 50;
  }

  return {
    id: 'plank_perfect',
    name: 'Plank: Perfect Timed Hold',
    exerciseId: 'plank',
    description: '2.0s initial stable hold + 5s clean hold. Rep counted (1), score 100, no mistakes.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export function generatePlankSaggingScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Initial 2.2s stable hold
  for (let i = 0; i < 44; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPlankSkeleton(0, 0),
      description: 'Initial stable hold',
    });
    t += 50;
  }

  // 2. 3 seconds of sagging hips (hipSagOffset = 0.08, alignment drops <165°)
  for (let i = 0; i < 60; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPlankSkeleton(0.08, 0),
      description: 'Hips sagging toward floor',
    });
    t += 50;
  }

  // 3. 2 seconds of recovery back to good form
  for (let i = 0; i < 40; i++) {
    frames.push({
      timestamp: t,
      landmarks: createPlankSkeleton(0, 0),
      description: 'Corrected form',
    });
    t += 50;
  }

  return {
    id: 'plank_sagging',
    name: 'Plank: Sagging Hips',
    exerciseId: 'plank',
    description: 'Hips sag for 3 seconds of the hold. Flags "Hips sagging", score reduced.',
    expectedReps: 1,
    expectedMistakes: ['Hips sagging'],
    expectedMinScore: 40,
    expectedMaxScore: 85,
    frames,
  };
}

export function generatePlankEarlyStopScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Initial 2.2s stable hold
  for (let i = 0; i < 44; i++) {
    frames.push({ timestamp: t, landmarks: createPlankSkeleton(0, 0) });
    t += 50;
  }

  // 2. 6 seconds of good hold
  for (let i = 0; i < 120; i++) {
    frames.push({ timestamp: t, landmarks: createPlankSkeleton(0, 0) });
    t += 50;
  }

  // 3. Dismounts: stands up / leaves frame for 2.5s (50 frames @ 50ms)
  for (let i = 0; i < 70; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'plank_early_stop',
    name: 'Plank: User Dismounts Early',
    exerciseId: 'plank',
    description: 'Holds for 6s then stands up. Auto-finishes when dismounted for 2s.',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 90,
    expectedMaxScore: 100,
    frames,
  };
}

export const ALL_SYNTHETIC_SCENARIOS: SyntheticScenario[] = [
  generatePerfectSquatScenario(),
  generateShallowSquatScenario(),
  generateExcessiveLeanScenario(),
  generateFastDescentScenario(),
  generatePerfectPushUpScenario(),
  generateShallowPushUpScenario(),
  generateSaggingHipsPushUpScenario(),
  generateFastPushUpScenario(),
  generatePerfectBicepCurlScenario(),
  generateSwingingBicepCurlScenario(),
  generateHalfBicepCurlScenario(),
  generateFastBicepCurlScenario(),
  generatePerfectLungeScenario(),
  generateShallowLungeScenario(),
  generateForwardLeanLungeScenario(),
  generateFastLungeScenario(),
  generatePlankWellHeldScenario(),
  generatePlankSaggingScenario(),
  generatePlankEarlyStopScenario(),
  generateJitterScenario(),
  generateOutOfFrameScenario(),
];
