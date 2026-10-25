// FitForm Skeleton Rendering Utility
// Draws smoothed joints and glowing connector bones over the mirrored video canvas.

import { LandmarkPoint, POSE_LANDMARKS } from './angleMath';
import { FormStatus } from './squatDetector';

export const POSE_CONNECTIONS: [number, number][] = [
  // Torso box
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // Left Arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],

  // Right Arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

  // Left Leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],

  // Right Leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],

  // Head
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_SHOULDER],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_SHOULDER],
];

/**
 * Draws the skeleton bones and joint nodes onto a 2D canvas context.
 */
export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  width: number,
  height: number,
  formStatus: FormStatus = 'good',
  mirrored: boolean = true
) {
  if (!landmarks || landmarks.length < 33) return;

  ctx.save();

  // Color scheme based on form status
  let boneColor = 'rgba(99, 102, 241, 0.85)'; // Indigo
  let jointColor = '#818cf8';
  let glowColor = 'rgba(99, 102, 241, 0.5)';

  if (formStatus === 'good') {
    boneColor = 'rgba(16, 185, 129, 0.9)'; // Emerald Green
    jointColor = '#34d399';
    glowColor = 'rgba(16, 185, 129, 0.6)';
  } else if (formStatus === 'warning') {
    boneColor = 'rgba(245, 158, 11, 0.9)'; // Amber Yellow
    jointColor = '#fbbf24';
    glowColor = 'rgba(245, 158, 11, 0.6)';
  } else if (formStatus === 'bad') {
    boneColor = 'rgba(239, 68, 68, 0.9)'; // Red
    jointColor = '#f87171';
    glowColor = 'rgba(239, 68, 68, 0.6)';
  }

  // Helper to map normalized coordinates to canvas space
  const getCanvasCoords = (pt: LandmarkPoint) => {
    const rawX = pt.x * width;
    const finalX = mirrored ? width - rawX : rawX;
    const finalY = pt.y * height;
    return { x: finalX, y: finalY };
  };

  // 1. Draw Bones (Connectors)
  ctx.lineWidth = 4;
  ctx.strokeStyle = boneColor;
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  for (const [fromIdx, toIdx] of POSE_CONNECTIONS) {
    const ptA = landmarks[fromIdx];
    const ptB = landmarks[toIdx];

    const visA = ptA.visibility ?? 1;
    const visB = ptB.visibility ?? 1;

    // Only draw if both points are sufficiently visible
    if (visA > 0.35 && visB > 0.35) {
      const pA = getCanvasCoords(ptA);
      const pB = getCanvasCoords(ptB);

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }
  }

  // 2. Draw Joint Nodes
  ctx.shadowBlur = 4;
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if ((pt.visibility ?? 1) > 0.35) {
      const p = getCanvasCoords(pt);

      // Key joints get larger dots
      const isKeyJoint =
        i === POSE_LANDMARKS.LEFT_KNEE ||
        i === POSE_LANDMARKS.RIGHT_KNEE ||
        i === POSE_LANDMARKS.LEFT_HIP ||
        i === POSE_LANDMARKS.RIGHT_HIP ||
        i === POSE_LANDMARKS.LEFT_SHOULDER ||
        i === POSE_LANDMARKS.RIGHT_SHOULDER;

      const radius = isKeyJoint ? 6 : 4;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = jointColor;
      ctx.fill();

      // Outer white ring
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }

  ctx.restore();
}
