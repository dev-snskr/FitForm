// tests/exerciseAnalyzers.test.ts
// Comprehensive unit tests for FitForm Exercise Analyzers:
// Squat, Push-Up, Bicep Curl, Lunge, Plank, and Registry resolution.

import { describe, it, expect, beforeEach } from 'vitest';
import { PushUpAnalyzer } from '../src/lib/pose/analyzers/pushUpAnalyzer';
import { BicepCurlAnalyzer } from '../src/lib/pose/analyzers/bicepCurlAnalyzer';
import { SquatAnalyzer } from '../src/lib/pose/analyzers/squatAnalyzer';
import { LungeAnalyzer } from '../src/lib/pose/analyzers/lungeAnalyzer';
import { PlankAnalyzer } from '../src/lib/pose/analyzers/plankAnalyzer';
import {
  createExerciseAnalyzer,
  resolveExerciseId,
  isExerciseFormTrackable,
  getExerciseSetupGuide,
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
  generatePerfectLungeScenario,
  generateShallowLungeScenario,
  generateForwardLeanLungeScenario,
  generateFastLungeScenario,
  generatePlankWellHeldScenario,
  generatePlankSaggingScenario,
  generatePlankEarlyStopScenario,
  generateJitterScenario,
  generateOutOfFrameScenario,
  createPushUpSkeleton,
  createPlankSkeleton,
  createLungeSkeleton,
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
      expect(res!.currentScore).toBe(75);
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
      expect(res!.currentScore).toBe(80);
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
      expect(res!.currentScore).toBe(85);
      expect(res!.completedReps[0].mistakes).toContain('Too fast');
    });

    it('1.5 Plank Hold Requirement: does not start counting reps if user has not held stable plank for 1.5s', () => {
      for (let i = 0; i < 12; i++) {
        const res = pushUpAnalyzer.processFrame(createPushUpSkeleton(165, 0), i * 50);
        expect(res.isReady).toBe(false);
        expect(res.repCount).toBe(0);
      }
    });
  });

  describe('2. Bicep Curl Analyzer Biomechanics Suite', () => {
    let bicepAnalyzer: BicepCurlAnalyzer;

    beforeEach(() => {
      bicepAnalyzer = new BicepCurlAnalyzer('right');
    });

    it('2.1 Perfect Bicep Curl: full range (165° -> 45° -> 165°) -> 1 rep, score 100, 0 mistakes', () => {
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
      expect(bicepAnalyzer.getRepCount()).toBe(1);
      expect(bicepAnalyzer.getTotalScore()).toBe(100);
    });

    it('2.2 Elbow Sway / Body Swinging: flags "Keep your elbows pinned" when elbow drifts >8cm', () => {
      const scenario = generateSwingingBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(80);
      expect(res!.completedReps[0].mistakes).toContain('Swinging your body');
    });

    it('2.3 Half Rep: flags "Not curling high enough" when peak contraction fails to reach <65°', () => {
      const scenario = generateHalfBicepCurlScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = bicepAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(75);
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
      expect(res!.currentScore).toBe(85);
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

  describe('4. Lunge Analyzer Biomechanics Suite', () => {
    let lungeAnalyzer: LungeAnalyzer;

    beforeEach(() => {
      lungeAnalyzer = new LungeAnalyzer('auto');
    });

    it('4.1 Perfect Lunge: knee bends to 88° (<100°) -> 1 rep, score 100, 0 mistakes', () => {
      const scenario = generatePerfectLungeScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = lungeAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(100);
      expect(res!.formStatus).toBe('good');
      expect(res!.completedReps[0].mistakes).toEqual([]);
      expect(lungeAnalyzer.getRepCount()).toBe(1);
      expect(lungeAnalyzer.getTotalScore()).toBe(100);
    });

    it('4.2 Shallow Lunge: flags "Not deep enough" when front knee fails to reach <100°', () => {
      const scenario = generateShallowLungeScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = lungeAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(75);
      expect(res!.completedReps[0].mistakes).toContain('Not deep enough');
      expect(lungeAnalyzer.getMistakesSummary()).toContain('Not deep enough');
    });

    it('4.3 Torso Lean: flags "Leaning too far forward" when torso angle >25°', () => {
      const scenario = generateForwardLeanLungeScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = lungeAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(80);
      expect(res!.completedReps[0].mistakes).toContain('Leaning too far forward');
      expect(lungeAnalyzer.getMistakesSummary()).toContain('Leaning too far forward');
    });

    it('4.4 Fast Lunge: flags "Too fast" when descent is under 850ms', () => {
      const scenario = generateFastLungeScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = lungeAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.repCount).toBe(1);
      expect(res!.currentScore).toBe(85);
      expect(res!.completedReps[0].mistakes).toContain('Too fast');
    });

    it('4.5 Leg Selection: handles auto-detect and manual leg toggle', () => {
      expect(lungeAnalyzer.getLegChoice()).toBe('auto');
      lungeAnalyzer.setLegChoice('left');
      expect(lungeAnalyzer.getLegChoice()).toBe('left');
      lungeAnalyzer.setLegChoice('right');
      expect(lungeAnalyzer.getLegChoice()).toBe('right');
    });
  });

  describe('5. Plank Analyzer Biomechanics Suite', () => {
    let plankAnalyzer: PlankAnalyzer;

    beforeEach(() => {
      plankAnalyzer = new PlankAnalyzer(45);
    });

    it('5.1 Stability hold requirement: does not start timer until user holds stable for 2.0s', () => {
      // 1.5 seconds of plank (30 frames @ 50ms)
      for (let i = 0; i < 30; i++) {
        const res = plankAnalyzer.processFrame(createPlankSkeleton(0, 0), i * 50);
        expect(res.isTimerActive).toBe(false);
        expect(res.holdDurationSeconds).toBe(0);
      }
    });

    it('5.2 Perfect Timed Hold: 2.0s stability -> active timer -> records duration, score 100, 0 mistakes', () => {
      const scenario = generatePlankWellHeldScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = plankAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.isTimerActive).toBe(true);
      expect(res!.holdDurationSeconds).toBeGreaterThanOrEqual(5);
      expect(res!.currentScore).toBe(100);
      expect(res!.formStatus).toBe('good');
      expect(plankAnalyzer.getRepCount()).toBe(1);
      expect(plankAnalyzer.getTotalScore()).toBe(100);
      expect(plankAnalyzer.getMistakesSummary()).toEqual([]);
    });

    it('5.3 Sagging Hips: flags "Hips sagging" when alignment drops <165° toward floor', () => {
      const scenario = generatePlankSaggingScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = plankAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.isTimerActive).toBe(true);
      expect(plankAnalyzer.getMistakesSummary()).toContain('Hips sagging');
      expect(res!.currentScore).toBeLessThan(100);
    });

    it('5.4 Early Dismount: auto-finishes after user stands up / leaves frame', () => {
      const scenario = generatePlankEarlyStopScenario();
      let res = null;
      for (const frame of scenario.frames) {
        res = plankAnalyzer.processFrame(frame.landmarks, frame.timestamp);
      }

      expect(res).not.toBeNull();
      expect(res!.shouldAutoFinish).toBe(true);
      expect(res!.holdDurationSeconds).toBeGreaterThanOrEqual(6);
    });

    it('5.5 Target duration configuration: correctly sets target duration in seconds', () => {
      const plank60 = new PlankAnalyzer(60);
      expect(plank60.getTargetDuration()).toBe(60);
    });
  });

  describe('6. Exercise Registry & Analyzer Factory Suite', () => {
    it('6.1 Correctly resolves supported exercise IDs including Lunge and Plank', () => {
      expect(resolveExerciseId('Bodyweight Squat')).toBe('squat');
      expect(resolveExerciseId('Squats')).toBe('squat');
      expect(resolveExerciseId('Push-Up')).toBe('push_up');
      expect(resolveExerciseId('Push up')).toBe('push_up');
      expect(resolveExerciseId('Bicep Curl')).toBe('bicep_curl');
      expect(resolveExerciseId('Dumbbell Bicep Curls')).toBe('bicep_curl');
      expect(resolveExerciseId('Walking / Static Lunge')).toBe('lunge');
      expect(resolveExerciseId('Lunges')).toBe('lunge');
      expect(resolveExerciseId('Forearm Plank')).toBe('plank');
      expect(resolveExerciseId('Plank Hold')).toBe('plank');
      expect(resolveExerciseId('Jumping Jacks')).toBeNull();
    });

    it('6.2 Correctly reports form trackability', () => {
      expect(isExerciseFormTrackable('Bodyweight Squat')).toBe(true);
      expect(isExerciseFormTrackable('Push-Up')).toBe(true);
      expect(isExerciseFormTrackable('Bicep Curl')).toBe(true);
      expect(isExerciseFormTrackable('Walking / Static Lunge')).toBe(true);
      expect(isExerciseFormTrackable('Forearm Plank')).toBe(true);
      expect(isExerciseFormTrackable('Jumping Jacks')).toBe(false);
    });

    it('6.3 Factory creates clean instances of all analyzers', () => {
      const squat = createExerciseAnalyzer('squat');
      expect(squat).toBeInstanceOf(SquatAnalyzer);

      const pushUp = createExerciseAnalyzer('Push-Up');
      expect(pushUp).toBeInstanceOf(PushUpAnalyzer);

      const bicep = createExerciseAnalyzer('Bicep Curl', { arm: 'left' });
      expect(bicep).toBeInstanceOf(BicepCurlAnalyzer);
      expect((bicep as BicepCurlAnalyzer).getArmChoice()).toBe('left');

      const lunge = createExerciseAnalyzer('Walking / Static Lunge', { leg: 'left' });
      expect(lunge).toBeInstanceOf(LungeAnalyzer);
      expect((lunge as LungeAnalyzer).getLegChoice()).toBe('left');

      const plank = createExerciseAnalyzer('Forearm Plank', { targetSeconds: 45 });
      expect(plank).toBeInstanceOf(PlankAnalyzer);
      expect((plank as PlankAnalyzer).getTargetDuration()).toBe(45);
    });

    it('6.4 Setup guide lookup returns clear instructions for all exercises', () => {
      expect(getExerciseSetupGuide('squat')).toBeTruthy();
      expect(getExerciseSetupGuide('push_up')).toContain('side-on');
      expect(getExerciseSetupGuide('bicep_curl')).toContain('side-on');
      expect(getExerciseSetupGuide('lunge')).toContain('side-on');
      expect(getExerciseSetupGuide('plank')).toContain('side-on');
    });
  });
});
