// tests/exerciseAnalyzers.test.ts
// Comprehensive unit tests for FitForm Exercise Analyzers:
// Push-Up, Bicep Curl, Squat, Plank Hold, and Registry resolution.

import { describe, it, expect, beforeEach } from 'vitest';
import { PushUpAnalyzer } from '../src/lib/pose/analyzers/pushUpAnalyzer';
import { BicepCurlAnalyzer } from '../src/lib/pose/analyzers/bicepCurlAnalyzer';
import { SquatAnalyzer } from '../src/lib/pose/analyzers/squatAnalyzer';
import {
  createExerciseAnalyzer,
  resolveExerciseId,
  isExerciseFormTrackable,
} from '../src/lib/pose/analyzers/registry';
import {
  generatePerfectPushUpScenario,
  generateShallowPushUpScenario,
  generateSaggingHipsPushUpScenario,
  generateFastPushUpScenario,
  generatePerfectBicepCurlScenario,
  generateSwingingBicepCurlScenario,
  generateHalfBicepCurlScenario,
  generateFastBicepCurlScenario,
  generatePerfectSquatScenario,
  generateJitterScenario,
  generateOutOfFrameScenario,
  createPushUpSkeleton,
} from '../src/lib/pose/syntheticData';

describe('Exercise Analyzers & Form-Check Engine', () => {
  describe('1. Push-Up Analyzer Biomechanics Suite', () => {
    let pushUpAnalyzer: PushUpAnalyzer;

    beforeEach(() => {
      pushUpAnalyzer = new PushUpAnalyzer();
    });

    it('1.1 Perfect Push-Up: 1.5s plank hold -> full depth (<90°) -> 1 rep, score 100, 0 mistakes', () => {
      const scenario = generatePerfectPushUpScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = pushUpAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(100);
      expect(res!.formStatus).toBe('good');
      expect(res!.completedReps[0].mistakes).toEqual([]);
      expect(pushUpAnalyzer.getRepCount()).toBe(1);
      expect(pushUpAnalyzer.getTotalScore()).toBe(100);
    });

    it('1.2 Shallow Push-Up: flags "Go lower" when elbow fails to reach <100°', () => {
      const scenario = generateShallowPushUpScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = pushUpAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(75); // 100 - 25 = 75
      expect(res!.completedReps[0].mistakes).toContain('Go lower');
      expect(pushUpAnalyzer.getMistakesSummary()).toContain('Go lower');
    });

    it('1.3 Sagging Hips: flags "Hips sagging" when alignment angle drops <160° with hip lower than line', () => {
      const scenario = generateSaggingHipsPushUpScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = pushUpAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(80); // 100 - 20 = 80
      expect(res!.completedReps[0].mistakes).toContain('Hips sagging');
    });

    it('1.4 Fast Push-Up: flags "Too fast" when lowering duration < 850ms', () => {
      const scenario = generateFastPushUpScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = pushUpAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(85); // 100 - 15 = 85
      expect(res!.completedReps[0].mistakes).toContain('Too fast');
    });

    it('1.5 Plank Hold Requirement: does not start counting reps if user has not held stable plank for 1.5s', () => {
      // Hold plank for only 600ms (<1500ms)
      for (let i = 0; i < 12; i++) {
        const res = pushUpAnalyzer.processFrame(createPushUpSkeleton(165, 0), i * 50);
        expect(res.isReady).toBe(false);
        expect(res.repCount).toBe(0);
      }

      // Drop early into a pushup movement before being ready
      const dropRes = pushUpAnalyzer.processFrame(createPushUpSkeleton(85, 0), 700);
      expect(dropRes.isReady).toBe(false);
      expect(dropRes.repCount).toBe(0);
    });
  });

  describe('2. Bicep Curl Analyzer Biomechanics Suite', () => {
    let bicepAnalyzer: BicepCurlAnalyzer;

    beforeEach(() => {
      bicepAnalyzer = new BicepCurlAnalyzer('right');
    });

    it('2.1 Perfect Bicep Curl: full flexion (<50°) -> full extension (>150°) -> 1 rep, score 100, 0 mistakes', () => {
      const scenario = generatePerfectBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(100);
      expect(res!.formStatus).toBe('good');
      expect(res!.completedReps[0].mistakes).toEqual([]);
      expect(bicepAnalyzer.getTotalScore()).toBe(100);
    });

    it('2.2 Swinging Bicep Curl: flags "Swinging your body" when torso lean > 15°', () => {
      const scenario = generateSwingingBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(80); // 100 - 20 = 80
      expect(res!.completedReps[0].mistakes).toContain('Swinging your body');
    });

    it('2.3 Half Curl: flags "Not curling high enough" when arm only flexes to 80°', () => {
      const scenario = generateHalfBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(75); // 100 - 25 = 75
      expect(res!.completedReps[0].mistakes).toContain('Not curling high enough');
    });

    it('2.4 Fast Bicep Curl: flags "Too fast" when curl completes in 350ms (<800ms)', () => {
      const scenario = generateFastBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(85); // 100 - 15 = 85
      expect(res!.completedReps[0].mistakes).toContain('Too fast');
    });

    it('2.5 Arm Selection: allows switching between left and right arm tracking', () => {
      expect(bicepAnalyzer.getArmChoice()).toBe('right');
      bicepAnalyzer.setArmChoice('left');
      expect(bicepAnalyzer.getArmChoice()).toBe('left');
    });
  });

  describe('3. Squat Analyzer Compatibility Suite', () => {
    it('3.1 Perfect Squat: records 1 rep, score 100, 0 mistakes', () => {
      const squatAnalyzer = new SquatAnalyzer();
      const scenario = generatePerfectSquatScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = squatAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(100);
      expect(res!.completedReps[0].mistakes).toEqual([]);
    });

    it('3.2 Standing Still: stays at 0 reps', () => {
      const squatAnalyzer = new SquatAnalyzer();
      const scenario = generateJitterScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = squatAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(0);
      expect(res!.currentScore).toBe(100);
    });

    it('3.3 Out of Frame: flags low confidence body warning', () => {
      const squatAnalyzer = new SquatAnalyzer();
      const scenario = generateOutOfFrameScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = squatAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.isBodyInFrame).toBe(false);
      expect(res!.formStatus).toBe('bad');
    });
  });

  describe('4. Exercise Registry & Analyzer Factory Suite', () => {
    it('4.1 Correctly resolves supported exercise IDs', () => {
      expect(resolveExerciseId('Bodyweight Squat')).toBe('squat');
      expect(resolveExerciseId('Squats')).toBe('squat');
      expect(resolveExerciseId('Push-Up')).toBe('push_up');
      expect(resolveExerciseId('Push up')).toBe('push_up');
      expect(resolveExerciseId('Bicep Curl')).toBe('bicep_curl');
      expect(resolveExerciseId('Dumbbell Bicep Curls')).toBe('bicep_curl');
      expect(resolveExerciseId('Forearm Plank')).toBeNull();
      expect(resolveExerciseId('Walking / Static Lunge')).toBeNull();
    });

    it('4.2 Correctly reports form trackability', () => {
      expect(isExerciseFormTrackable('Bodyweight Squat')).toBe(true);
      expect(isExerciseFormTrackable('Push-Up')).toBe(true);
      expect(isExerciseFormTrackable('Bicep Curl')).toBe(true);
      expect(isExerciseFormTrackable('Walking / Static Lunge')).toBe(false);
      expect(isExerciseFormTrackable('Forearm Plank')).toBe(false);
    });

    it('4.3 Factory creates clean instances of analyzers', () => {
      const squat = createExerciseAnalyzer('squat');
      expect(squat).toBeInstanceOf(SquatAnalyzer);

      const pushUp = createExerciseAnalyzer('Push-Up');
      expect(pushUp).toBeInstanceOf(PushUpAnalyzer);

      const bicep = createExerciseAnalyzer('Bicep Curl', { arm: 'left' });
      expect(bicep).toBeInstanceOf(BicepCurlAnalyzer);
      expect((bicep as BicepCurlAnalyzer).getArmChoice()).toBe('left');
    });
  });
});
