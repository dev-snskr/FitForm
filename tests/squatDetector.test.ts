// tests/squatDetector.test.ts
// Unit tests for Squat Detector state machine, rep counter, and form scoring.

import { describe, it, expect, beforeEach } from 'vitest';
import { SquatDetector } from '../src/lib/pose/squatDetector';
import {
  generatePerfectSquatScenario,
  generateShallowSquatScenario,
  generateExcessiveLeanScenario,
  generateFastDescentScenario,
  generateJitterScenario,
  generateOutOfFrameScenario,
} from '../src/lib/pose/syntheticData';

describe('SquatDetector Biomechanical Analysis Suite', () => {
  let detector: SquatDetector;

  beforeEach(() => {
    detector = new SquatDetector();
  });

  it('1. Perfect Squat: records 1 rep, score 100, 0 mistakes', () => {
    const scenario = generatePerfectSquatScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.repCount).toBe(1);
    expect(finalResult!.currentScore).toBe(100);
    expect(finalResult!.completedReps[0].mistakes).toEqual([]);
    expect(finalResult!.formStatus).toBe('good');
  });

  it('2. Shallow Squat: flags "Not deep enough", deducts points', () => {
    const scenario = generateShallowSquatScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.repCount).toBe(1);
    expect(finalResult!.completedReps[0].mistakes).toContain('Not deep enough');
    expect(finalResult!.currentScore).toBe(75); // 100 - 25 = 75
  });

  it('3. Excessive Forward Lean: flags "Leaning too far forward"', () => {
    const scenario = generateExcessiveLeanScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.repCount).toBe(1);
    expect(finalResult!.completedReps[0].mistakes).toContain('Leaning too far forward');
    expect(finalResult!.currentScore).toBe(80); // 100 - 20 = 80
  });

  it('4. Too Fast Descent: flags "Too fast — control your descent"', () => {
    const scenario = generateFastDescentScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.repCount).toBe(1);
    expect(finalResult!.completedReps[0].mistakes).toContain('Too fast — control your descent');
    expect(finalResult!.currentScore).toBe(85); // 100 - 15 = 85
  });

  it('5. Stationary Jitter: ignores noise, stays at 0 reps', () => {
    const scenario = generateJitterScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.repCount).toBe(0);
    expect(finalResult!.currentScore).toBe(100);
    expect(finalResult!.completedReps.length).toBe(0);
  });

  it('6. Body Out of Frame: warns user to step back', () => {
    const scenario = generateOutOfFrameScenario();
    let finalResult = null;

    for (const frame of scenario.frames) {
      finalResult = detector.processFrame(frame.landmarks, frame.timestamp);
    }

    expect(finalResult).not.toBeNull();
    expect(finalResult!.isBodyInFrame).toBe(false);
    expect(finalResult!.bodyInFrameMessage).toBe("Step back, we can't see your full body");
    expect(finalResult!.formStatus).toBe('bad');
  });
});
