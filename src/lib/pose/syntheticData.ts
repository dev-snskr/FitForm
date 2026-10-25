// FitForm Synthetic Pose Sequence Generator
// Generates realistic landmark frames for unit tests and the developer pose simulation page.

import { LandmarkPoint, POSE_LANDMARKS } from './angleMath';

export interface SyntheticFrame {
  timestamp: number;
  landmarks: LandmarkPoint[];
  description?: string;
}

export interface SyntheticScenario {
  id: string;
  name: string;
  description: string;
  expectedReps: number;
  expectedMistakes: string[];
  expectedMinScore: number;
  expectedMaxScore: number;
  frames: SyntheticFrame[];
}

/**
 * Creates a base 33-landmark skeleton in a standard side-view standing posture.
 */
function createBaseSkeleton(
  kneeAngleDeg: number = 175,
  torsoLeanDeg: number = 8,
  visibility: number = 0.95
): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array(33)
    .fill(null)
    .map(() => ({ x: 0.5, y: 0.5, z: 0, visibility }));

  // Shin length L1 = 0.25, Thigh length L2 = 0.25, Torso length L3 = 0.28
  const L1 = 0.25;
  const L2 = 0.25;
  const L3 = 0.28;

  // Ankle position
  const ankleX = 0.5;
  const ankleY = 0.82;

  // Shin angle from vertical (shins tilt slightly forward in a squat, e.g. 10° to 22°)
  const kneeBend = Math.max(0, 180 - kneeAngleDeg);
  const shinTiltDeg = 10 + (kneeBend / 90) * 12; // 10° to 22° forward tilt
  const shinTiltRad = (shinTiltDeg * Math.PI) / 180;

  // Knee position
  const kneeX = ankleX + L1 * Math.sin(shinTiltRad);
  const kneeY = ankleY - L1 * Math.cos(shinTiltRad);

  // Exact Knee Angle Geometry:
  // Vector (K -> A) angle
  const angleKA = Math.atan2(ankleY - kneeY, ankleX - kneeX);
  // Vector (K -> H) angle = angleKA + kneeAngleDeg (in radians)
  const angleKH = angleKA + (kneeAngleDeg * Math.PI) / 180;

  // Hip position
  const hipX = kneeX + L2 * Math.cos(angleKH);
  const hipY = kneeY + L2 * Math.sin(angleKH);

  // Torso position: Lean angle from vertical (0° = straight up, >0° = leaning forward to the right)
  const torsoRad = (torsoLeanDeg * Math.PI) / 180;
  const shoulderX = hipX + L3 * Math.sin(torsoRad);
  const shoulderY = hipY - L3 * Math.cos(torsoRad);

  // Toe and Head
  const toeX = ankleX + 0.12;
  const toeY = ankleY + 0.02;
  const noseX = shoulderX + 0.04;
  const noseY = shoulderY - 0.08;

  // Right side (primary side facing camera)
  points[POSE_LANDMARKS.RIGHT_ANKLE] = { x: ankleX, y: ankleY, visibility };
  points[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = { x: toeX, y: toeY, visibility };
  points[POSE_LANDMARKS.RIGHT_KNEE] = { x: kneeX, y: kneeY, visibility };
  points[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX, y: hipY, visibility };
  points[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility };
  points[POSE_LANDMARKS.NOSE] = { x: noseX, y: noseY, visibility };

  // Left side (slightly lower visibility as it is behind)
  points[POSE_LANDMARKS.LEFT_ANKLE] = { x: ankleX, y: ankleY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_FOOT_INDEX] = { x: toeX, y: toeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_KNEE] = { x: kneeX, y: kneeY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_HIP] = { x: hipX, y: hipY, visibility: visibility * 0.4 };
  points[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, visibility: visibility * 0.4 };

  return points;
}

/**
 * 1. Perfect Squat Scenario:
 * Stands (175 deg) -> smooth descent down to 88 deg over 1.4s -> smooth ascent back to 175 deg.
 * Torso lean stays under 25 deg.
 */
export function generatePerfectSquatScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  // 1. Standing (0.5s)
  for (let i = 0; i < 10; i++) {
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175, 8),
      description: 'Standing tall',
    });
    t += 50;
  }

  // 2. Descent to 88 deg over 1400ms (28 frames)
  const descentSteps = 28;
  for (let i = 0; i < descentSteps; i++) {
    const progress = i / descentSteps;
    const angle = 175 - progress * (175 - 88);
    const lean = 8 + progress * 15; // max 23 deg lean (well under 45)
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(angle, lean),
      description: 'Descending with controlled tempo',
    });
    t += 50;
  }

  // 3. Pause at bottom (0.2s)
  for (let i = 0; i < 4; i++) {
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(88, 24),
      description: 'At deep parallel bottom (88°)',
    });
    t += 50;
  }

  // 4. Ascent back to standing (1200ms)
  const ascentSteps = 24;
  for (let i = 0; i < ascentSteps; i++) {
    const progress = i / ascentSteps;
    const angle = 88 + progress * (175 - 88);
    const lean = 24 - progress * 16;
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(angle, lean),
      description: 'Ascending back to upright stance',
    });
    t += 50;
  }

  // 5. Final Standing (0.5s)
  for (let i = 0; i < 10; i++) {
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175, 8),
      description: 'Rep complete · Standing upright',
    });
    t += 50;
  }

  return {
    id: 'perfect_squat',
    name: '1. Perfect Squat (Deep & Controlled)',
    description: 'Full depth (88° knee angle), controlled 1.4s descent, upright spine (23° lean).',
    expectedReps: 1,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

/**
 * 2. Shallow Squat Scenario:
 * Reverses early at 120 deg (does not reach 100 deg threshold).
 */
export function generateShallowSquatScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  // Partial descent: stops at 120 deg
  for (let i = 0; i < 22; i++) {
    const angle = 175 - (i / 22) * (175 - 120);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 15) });
    t += 50;
  }

  // Ascends back up
  for (let i = 0; i < 18; i++) {
    const angle = 120 + (i / 18) * (175 - 120);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 10) });
    t += 50;
  }

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'shallow_squat',
    name: '2. Shallow Squat (Incomplete Depth)',
    description: 'Reverses at 120° knee angle instead of reaching below 100°.',
    expectedReps: 1,
    expectedMistakes: ['Not deep enough'],
    expectedMinScore: 75,
    expectedMaxScore: 75,
    frames,
  };
}

/**
 * 3. Excessive Torso Lean Scenario:
 * Reaches depth, but torso leans 54 degrees forward (exceeding 45 deg limit).
 */
export function generateExcessiveLeanScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  // Descent with severe forward pitch (slow, controlled tempo over 1600ms)
  for (let i = 0; i < 32; i++) {
    const angle = 175 - (i / 32) * (175 - 92);
    const lean = 8 + (i / 32) * 48; // reaches 56 deg lean
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean) });
    t += 50;
  }

  // Ascent (1200ms)
  for (let i = 0; i < 24; i++) {
    const angle = 92 + (i / 24) * (175 - 92);
    const lean = 56 - (i / 24) * 48;
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, lean) });
    t += 50;
  }

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'excessive_lean',
    name: '3. Forward Lean (Spine Pitched Forward)',
    description: 'Reaches depth but chest collapses forward to 56° lean from vertical.',
    expectedReps: 1,
    expectedMistakes: ['Leaning too far forward'],
    expectedMinScore: 80,
    expectedMaxScore: 80,
    frames,
  };
}

/**
 * 4. Too Fast Descent Scenario:
 * Dives bomb down in 400ms (< 950ms requirement).
 */
export function generateFastDescentScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  // Rapid 400ms descent (8 frames)
  for (let i = 0; i < 8; i++) {
    const angle = 175 - (i / 8) * (175 - 90);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 15) });
    t += 50;
  }

  // Ascent
  for (let i = 0; i < 18; i++) {
    const angle = 90 + (i / 18) * (175 - 90);
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(angle, 10) });
    t += 50;
  }

  for (let i = 0; i < 6; i++) {
    frames.push({ timestamp: t, landmarks: createBaseSkeleton(175, 8) });
    t += 50;
  }

  return {
    id: 'fast_descent',
    name: '4. Fast Descent (Uncontrolled Drop)',
    description: 'Drops down into squat in 400ms (too fast, risking knee joint shear).',
    expectedReps: 1,
    expectedMistakes: ['Too fast — control your descent'],
    expectedMinScore: 85,
    expectedMaxScore: 85,
    frames,
  };
}

/**
 * 5. Stationary Jitter Scenario:
 * Standing still with subtle sensor noise (±1.5 degrees). Should NOT trigger rep count.
 */
export function generateJitterScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 40; i++) {
    const jitter = (Math.sin(i * 1.5) + Math.cos(i * 2.1)) * 1.2;
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175 + jitter, 6 + jitter * 0.2),
      description: 'Standing still with sensor noise',
    });
    t += 50;
  }

  return {
    id: 'jitter',
    name: '5. Standing Still with Camera Jitter',
    description: 'Small noise vibrations around 175° knee angle. Must stay at 0 reps.',
    expectedReps: 0,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

/**
 * 6. Body Out of Frame Scenario:
 * Landmark confidence drops below threshold (e.g. 0.2).
 */
export function generateOutOfFrameScenario(): SyntheticScenario {
  const frames: SyntheticFrame[] = [];
  let t = 0;

  for (let i = 0; i < 20; i++) {
    frames.push({
      timestamp: t,
      landmarks: createBaseSkeleton(175, 8, 0.2), // 0.2 low confidence
      description: 'Body partially obscured or too close',
    });
    t += 50;
  }

  return {
    id: 'out_of_frame',
    name: '6. Body Out of Frame / Too Close',
    description: 'Low landmark visibility. Triggers "Step back, we can\'t see your full body".',
    expectedReps: 0,
    expectedMistakes: [],
    expectedMinScore: 100,
    expectedMaxScore: 100,
    frames,
  };
}

export const ALL_SYNTHETIC_SCENARIOS: SyntheticScenario[] = [
  generatePerfectSquatScenario(),
  generateShallowSquatScenario(),
  generateExcessiveLeanScenario(),
  generateFastDescentScenario(),
  generateJitterScenario(),
  generateOutOfFrameScenario(),
];
