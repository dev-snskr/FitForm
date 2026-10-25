// tests/realMetrics.test.ts
// Vitest automated suite for Step 5B Real Biometric Metrics & Analytics Engine

import { describe, it, expect } from 'vitest';
import {
  calculateConsistency,
  calculateStrengthVolume,
  calculatePersonalRecords,
  calculateFormTrends,
  calculateBodyProgress,
  calculateCalorieBurn,
  generateInsights,
  calculateUserMetrics,
} from '../src/lib/progress/metricsCalculator';
import { calculateStreak, PlanDayInfo } from '../src/lib/progress/streakCalculator';
import { calculateEstimatedCalories, getMetForExercise } from '../src/lib/progress/metValues';

describe('Real Metrics Calculator - Step 5B', () => {
  describe('Consistency & Adherence Calculation', () => {
    it('calculates consistency percentage ignoring rest days', () => {
      const workoutDays = [
        { dayNumber: 1, isRest: false },
        { dayNumber: 2, isRest: false },
        { dayNumber: 3, isRest: true }, // rest day
        { dayNumber: 4, isRest: false },
      ];
      const completedDays = new Set([1, 2]); // completed 2 of 3 planned

      const result = calculateConsistency(workoutDays, completedDays);
      expect(result.plannedWorkouts).toBe(3);
      expect(result.completedWorkouts).toBe(2);
      expect(result.consistencyPercentage).toBe(67);
    });

    it('returns 100% when all planned workouts are completed', () => {
      const workoutDays = [
        { dayNumber: 1, isRest: false },
        { dayNumber: 2, isRest: false },
      ];
      const completedDays = new Set([1, 2]);

      const result = calculateConsistency(workoutDays, completedDays);
      expect(result.consistencyPercentage).toBe(100);
    });

    it('returns 100% default when no workouts were planned yet', () => {
      const result = calculateConsistency([], new Set());
      expect(result.consistencyPercentage).toBe(100);
    });
  });

  describe('Strength Volume & PR Tracking', () => {
    it('computes volume as reps * load for weighted sets and reps for bodyweight', () => {
      const logs = [
        {
          dayNumber: 1,
          exercise: 'Squat',
          reps: 10,
          durationSeconds: null,
          loadKg: 50, // 10 * 50 = 500 kg
          completedAt: new Date('2026-10-01'),
        },
        {
          dayNumber: 1,
          exercise: 'Push-Up',
          reps: 15,
          durationSeconds: null,
          loadKg: null, // bodyweight: 15 reps, 0 load volume
          completedAt: new Date('2026-10-01'),
        },
      ];

      const result = calculateStrengthVolume(logs);
      expect(result.totalReps).toBe(25);
      expect(result.totalVolumeKg).toBe(515); // 500 weighted + 15 BW
      expect(result.weightedSetsCount).toBe(1);
      expect(result.bodyweightSetsCount).toBe(1);
    });

    it('extracts personal records per exercise and tags new PRs within 7 days', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const logs = [
        {
          dayNumber: 1,
          exercise: 'Squat',
          reps: 10,
          durationSeconds: null,
          loadKg: 40,
          completedAt: twentyDaysAgo,
        },
        {
          dayNumber: 2,
          exercise: 'Squat',
          reps: 12,
          durationSeconds: null,
          loadKg: 60,
          completedAt: threeDaysAgo,
        },
        {
          dayNumber: 1,
          exercise: 'Plank',
          reps: 1,
          durationSeconds: 45,
          loadKg: null,
          completedAt: twentyDaysAgo,
        },
      ];

      const prs = calculatePersonalRecords(logs);
      const squatPR = prs.find((p) => p.exercise === 'Squat');
      expect(squatPR).toBeDefined();
      expect(squatPR?.bestReps).toBe(12);
      expect(squatPR?.bestLoadKg).toBe(60);
      expect(squatPR?.isNew).toBe(true); // achieved 3 days ago

      const plankPR = prs.find((p) => p.exercise === 'Plank');
      expect(plankPR?.bestReps).toBe(45);
      expect(plankPR?.isNew).toBe(false); // achieved 20 days ago
    });
  });

  describe('Form Trends & Mistake Shift (earlier vs recent)', () => {
    it('requires at least 3 scored sessions to evaluate mistake shift', () => {
      const logs = [
        {
          dayNumber: 1,
          exercise: 'Squat',
          reps: 10,
          formScore: 80,
          mistakes: 'knees caving in',
          completedAt: new Date('2026-10-01'),
        },
        {
          dayNumber: 2,
          exercise: 'Squat',
          reps: 10,
          formScore: 85,
          mistakes: 'knees caving in',
          completedAt: new Date('2026-10-02'),
        },
      ];

      const result = calculateFormTrends(logs);
      expect(result.averageScore).toBe(83);
      expect(result.mistakeShift).toBeNull(); // < 3 sessions
    });

    it('identifies eliminated mistakes when user has >= 3 sessions', () => {
      const logs = [
        // Session 1 (Earlier)
        {
          dayNumber: 1,
          exercise: 'Squat',
          reps: 10,
          formScore: 70,
          mistakes: 'knees caving in, leaning too far forward',
          completedAt: new Date('2026-10-01'),
        },
        // Session 2 (Earlier)
        {
          dayNumber: 2,
          exercise: 'Squat',
          reps: 10,
          formScore: 75,
          mistakes: 'knees caving in',
          completedAt: new Date('2026-10-02'),
        },
        // Session 3 (Recent)
        {
          dayNumber: 3,
          exercise: 'Squat',
          reps: 10,
          formScore: 90,
          mistakes: 'leaning too far forward',
          completedAt: new Date('2026-10-03'),
        },
        // Session 4 (Recent)
        {
          dayNumber: 4,
          exercise: 'Squat',
          reps: 10,
          formScore: 95,
          mistakes: '', // no mistakes
          completedAt: new Date('2026-10-04'),
        },
      ];

      const result = calculateFormTrends(logs);
      expect(result.mistakeShift).not.toBeNull();
      // knees caving in was present in earlier half and absent in recent half
      expect(result.mistakeShift?.eliminatedMistakes).toContain('knees caving in');
    });
  });

  describe('Body Progress & Safe Rate Projection', () => {
    it('refuses to project goal date when fewer than 3 weigh-ins are recorded', () => {
      const weightEntries = [
        { weightKg: 80, date: '2026-10-01' },
        { weightKg: 79.5, date: '2026-10-04' },
      ];

      const result = calculateBodyProgress(weightEntries, 75, 'fat_loss');
      expect(result.projectedGoalDate).toBeNull();
      expect(result.projectionReason).toContain('at least 3 weigh-ins');
    });

    it('refuses to project goal date when weigh-ins span less than 7 days', () => {
      const weightEntries = [
        { weightKg: 80, date: '2026-10-01' },
        { weightKg: 79.8, date: '2026-10-02' },
        { weightKg: 79.5, date: '2026-10-03' },
      ];

      const result = calculateBodyProgress(weightEntries, 75, 'fat_loss');
      expect(result.projectedGoalDate).toBeNull();
      expect(result.projectionReason).toContain('at least 7 days');
    });

    it('projects goal date and verifies healthy velocity (< 1% bodyweight / week)', () => {
      // 80kg down to 78.5kg over 21 days (0.5 kg/week, which is 0.625% / week -> healthy)
      const weightEntries = [
        { weightKg: 80, date: '2026-10-01' },
        { weightKg: 79.2, date: '2026-10-10' },
        { weightKg: 78.5, date: '2026-10-22' },
      ];

      const result = calculateBodyProgress(weightEntries, 75, 'fat_loss');
      expect(result.projectedGoalDate).not.toBeNull();
      expect(result.isRateHealthy).toBe(true);
      expect(result.healthyRateWarning).toBeNull();
    });

    it('flags an alert when weight loss rate exceeds 1% bodyweight / week', () => {
      // 80kg down to 76kg over 14 days (2 kg/week, which is 2.5% / week -> unsafe)
      const weightEntries = [
        { weightKg: 80, date: '2026-10-01' },
        { weightKg: 78, date: '2026-10-08' },
        { weightKg: 76, date: '2026-10-15' },
      ];

      const result = calculateBodyProgress(weightEntries, 70, 'fat_loss');
      expect(result.projectedGoalDate).not.toBeNull();
      expect(result.isRateHealthy).toBe(false);
      expect(result.healthyRateWarning).toContain('Rate of weight change exceeds 1.0%');
    });
  });

  describe('Compendium MET Calorie Estimation', () => {
    it('looks up proper MET values per exercise', () => {
      expect(getMetForExercise('Squat')).toBe(5.5);
      expect(getMetForExercise('Push-Up')).toBe(4.5);
      expect(getMetForExercise('Bicep Curl')).toBe(3.8);
      expect(getMetForExercise('Lunge')).toBe(5.0);
      expect(getMetForExercise('Plank')).toBe(3.8);
    });

    it('calculates calories based on user bodyweight and duration', () => {
      // 70 kg person doing squats (MET 5.5) for 30 minutes (0.5 hr)
      // Calories = 5.5 * 70 * 0.5 = 192.5 -> 193 kcal
      const calories = calculateEstimatedCalories(30, 70, 5.5);
      expect(calories).toBe(193);
    });

    it('evaluates total session calorie burn correctly', () => {
      const logs = [
        { dayNumber: 1, exercise: 'Squat', reps: 10, durationSeconds: null, completedAt: new Date() },
        { dayNumber: 1, exercise: 'Squat', reps: 10, durationSeconds: null, completedAt: new Date() },
        { dayNumber: 1, exercise: 'Plank', reps: 1, durationSeconds: 60, completedAt: new Date() },
      ];
      const result = calculateCalorieBurn(logs, 75);
      expect(result.totalCalories).toBeGreaterThan(0);
      expect(result.activeMinutes).toBeGreaterThan(0);
      expect(result.isEstimated).toBe(true);
    });
  });

  describe('Rule-Based Plain-Language Insights (0 AI)', () => {
    it('generates encouraging insights based on consistency, form, and volume', () => {
      const insights = generateInsights(
        { consistencyPercentage: 100, completedWorkouts: 5, plannedWorkouts: 5 },
        { totalVolumeKg: 1500, totalReps: 120, personalRecords: [{ exercise: 'Squat', bestReps: 15, bestLoadKg: 50, achievedDate: '2026-10-25', isNew: true }] },
        { averageScore: 92, mistakeShift: { earlierTopMistakes: [], recentTopMistakes: [], eliminatedMistakes: ['knees caving in'], persistingMistakes: [] } },
        { currentWeightKg: 78, changeKg: -2, projectedGoalDate: '2026-12-01', healthyRateWarning: null },
        4
      );

      expect(insights.length).toBeGreaterThanOrEqual(3);
      expect(insights.some((i) => i.text.includes('100% workout consistency'))).toBe(true);
      expect(insights.some((i) => i.text.includes('Flawless technique'))).toBe(true);
      expect(insights.some((i) => i.text.includes('knees caving in'))).toBe(true);
    });
  });

  describe('Streak vs Week Row Synchronization (Audit Bug Regression)', () => {
    it('ensures week dots match active multi-day streak ending today', () => {
      // 8 completed workout days leading up to today
      const planDays: PlanDayInfo[] = [];
      for (let i = 1; i <= 8; i++) {
        planDays.push({
          dayNumber: i,
          workoutType: 'Full Body',
          isRest: false,
          isCompleted: true,
          formScore: 90,
          completedAt: new Date(Date.now() - (8 - i) * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const result = calculateStreak(planDays, '2026-10-01');
      expect(result.currentStreak).toBe(8);

      // The week row must NOT show Monday-Saturday blank when current streak is 8
      const doneDays = result.thisWeek.filter((d) => d.status === 'done');
      expect(doneDays.length).toBeGreaterThanOrEqual(6); // At least 6-7 days of the 7-day window must be 'done'
    });
  });
});
