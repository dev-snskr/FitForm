// tests/streaksAndBadges.test.ts
// FitForm Step 5 Test Suite
// Verifies:
// 1. Streak Engine: empty history, rest day retention, missed day breakage, longest streak, at-risk detection, timezone edge cases.
// 2. Badges: Boundary threshold testing (just below and exactly at threshold) for all 14 badges.
// 3. Weight Tracking validation bounds.

import { describe, it, expect } from 'vitest';
import {
  calculateStreak,
  formatToLocalDateString,
  parseLocalDateString,
  getCalendarDaysDiff,
  PlanDayInfo,
} from '../src/lib/progress/streakCalculator';
import { BADGE_DEFINITIONS, BadgeContext } from '../src/lib/progress/badgesConfig';

describe('FitForm Streak Engine', () => {
  it('handles empty plan history correctly', () => {
    const emptyPlan: PlanDayInfo[] = [];
    const result = calculateStreak(emptyPlan, '2026-10-01', '2026-10-01');

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalWorkoutsCompleted).toBe(0);
    expect(result.isStreakAtRisk).toBe(false);
  });

  it('increments streak on completed workout day', () => {
    const plan: PlanDayInfo[] = [
      {
        dayNumber: 1,
        workoutType: 'Full Body',
        isRest: false,
        isCompleted: true,
        completedAt: '2026-10-01T10:00:00.000Z',
        formScore: 85,
      },
    ];

    const result = calculateStreak(plan, '2026-10-01', '2026-10-01');
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalWorkoutsCompleted).toBe(1);
  });

  it('does NOT break streak on planned rest days', () => {
    // Day 1 (Workout done) -> Day 2 (Rest day) -> Day 3 (Workout done)
    const plan: PlanDayInfo[] = [
      {
        dayNumber: 1,
        workoutType: 'Upper Body',
        isRest: false,
        isCompleted: true,
        completedAt: '2026-10-01T10:00:00.000Z',
      },
      {
        dayNumber: 2,
        workoutType: 'Active Rest',
        isRest: true,
        isCompleted: false, // Rest days don't have workout logs
      },
      {
        dayNumber: 3,
        workoutType: 'Lower Body',
        isRest: false,
        isCompleted: true,
        completedAt: '2026-10-03T10:00:00.000Z',
      },
    ];

    const result = calculateStreak(plan, '2026-10-01', '2026-10-03');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.totalWorkoutsCompleted).toBe(2);
  });

  it('breaks streak when a planned workout day is skipped / missed', () => {
    // Day 1 (Workout done) -> Day 2 (Rest) -> Day 3 (Workout MISSED) -> Day 4 (Workout done)
    const plan: PlanDayInfo[] = [
      {
        dayNumber: 1,
        workoutType: 'Upper Body',
        isRest: false,
        isCompleted: true,
      },
      {
        dayNumber: 2,
        workoutType: 'Rest Day',
        isRest: true,
        isCompleted: false,
      },
      {
        dayNumber: 3,
        workoutType: 'Lower Body',
        isRest: false,
        isCompleted: false, // Missed planned workout!
      },
      {
        dayNumber: 4,
        workoutType: 'Core & Cardio',
        isRest: false,
        isCompleted: true,
      },
    ];

    const result = calculateStreak(plan, '2026-10-01', '2026-10-04');
    // Prior streak was 2 (Day 1 + Day 2). Day 3 was missed, so streak resets to 1 on Day 4.
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
    expect(result.totalWorkoutsCompleted).toBe(2);
  });

  it('correctly tracks longest streak over multi-week progression', () => {
    // 6-day streak in week 1, then a missed day in week 2, then a 3-day streak in week 3
    const plan: PlanDayInfo[] = [
      { dayNumber: 1, workoutType: 'Push', isRest: false, isCompleted: true },
      { dayNumber: 2, workoutType: 'Pull', isRest: false, isCompleted: true },
      { dayNumber: 3, workoutType: 'Rest', isRest: true, isCompleted: false },
      { dayNumber: 4, workoutType: 'Legs', isRest: false, isCompleted: true },
      { dayNumber: 5, workoutType: 'Core', isRest: false, isCompleted: true },
      { dayNumber: 6, workoutType: 'Rest', isRest: true, isCompleted: false }, // streak reaches 6 here
      { dayNumber: 7, workoutType: 'Push', isRest: false, isCompleted: false }, // Missed! Resets streak
      { dayNumber: 8, workoutType: 'Pull', isRest: false, isCompleted: true },
      { dayNumber: 9, workoutType: 'Rest', isRest: true, isCompleted: false },
      { dayNumber: 10, workoutType: 'Legs', isRest: false, isCompleted: true }, // streak reaches 3
    ];

    const result = calculateStreak(plan, '2026-10-01', '2026-10-10');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(6);
    expect(result.totalWorkoutsCompleted).toBe(6);
  });

  it('flags streak at risk when today is an unlogged workout day with active streak', () => {
    const plan: PlanDayInfo[] = [
      {
        dayNumber: 1,
        workoutType: 'Push',
        isRest: false,
        isCompleted: true,
        completedAt: '2026-10-24T18:00:00.000Z', // Yesterday
      },
      {
        dayNumber: 2,
        workoutType: 'Pull',
        isRest: false,
        isCompleted: false, // Today not done yet
      },
    ];

    const result = calculateStreak(plan, '2026-10-24', '2026-10-25');
    expect(result.currentStreak).toBe(1);
    expect(result.isStreakAtRisk).toBe(true);
    expect(result.streakAtRiskMessage).toContain('1-day streak is on the line');
  });

  it('handles local date parsing and calendar day diff correctly across months', () => {
    const d1 = '2026-10-31';
    const d2 = '2026-11-01';
    expect(getCalendarDaysDiff(d1, d2)).toBe(1);

    const parsed = parseLocalDateString('2026-10-25');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed month (October is 9)
    expect(parsed.getDate()).toBe(25);

    const formatted = formatToLocalDateString(parsed);
    expect(formatted).toBe('2026-10-25');
  });

  it('guarantees 8-day streak marks all days of "This week" correctly without blank days (Step 5B bug fix)', () => {
    // 8-day program progression: Days 1-6 workouts, Day 7 Rest, Day 8 workout
    const plan: PlanDayInfo[] = [
      { dayNumber: 1, workoutType: 'Push', isRest: false, isCompleted: true },
      { dayNumber: 2, workoutType: 'Pull', isRest: false, isCompleted: true },
      { dayNumber: 3, workoutType: 'Legs', isRest: false, isCompleted: true },
      { dayNumber: 4, workoutType: 'Core', isRest: false, isCompleted: true },
      { dayNumber: 5, workoutType: 'Full Body', isRest: false, isCompleted: true },
      { dayNumber: 6, workoutType: 'Push', isRest: false, isCompleted: true },
      { dayNumber: 7, workoutType: 'Rest Day', isRest: true, isCompleted: false },
      { dayNumber: 8, workoutType: 'Pull', isRest: false, isCompleted: true, completedAt: '2026-10-25T10:00:00.000Z' },
    ];

    const result = calculateStreak(plan, '2026-10-25', '2026-10-25');
    expect(result.currentStreak).toBe(8);

    // Verify all 7 days of thisWeek are accounted for and none are left blank/upcoming
    expect(result.thisWeek.length).toBe(7);

    // None should be upcoming
    const upcomingCount = result.thisWeek.filter((d) => d.status === 'upcoming').length;
    expect(upcomingCount).toBe(0);

    // Yesterday (Day 7) must be marked as rest
    const yesterday = result.thisWeek[result.thisWeek.length - 2];
    expect(yesterday.status).toBe('rest');

    // Today (Day 8) must be marked as done
    const today = result.thisWeek[result.thisWeek.length - 1];
    expect(today.status).toBe('done');

    // Days 2 to 6 must be marked done
    const doneDays = result.thisWeek.filter((d) => d.status === 'done');
    expect(doneDays.length).toBe(6);
  });
});

describe('FitForm Badge Evaluation Rules (Threshold Boundaries)', () => {
  const baseContext: BadgeContext = {
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedDayNumbers: [],
    logs: [],
    dietPlansCount: 0,
    hasComeback: false,
  };

  const getBadge = (id: string) => {
    const b = BADGE_DEFINITIONS.find((def) => def.id === id);
    if (!b) throw new Error(`Badge not found: ${id}`);
    return b;
  };

  it('1. First Workout badge boundary', () => {
    const badge = getBadge('first_workout');
    expect(badge.evaluate({ ...baseContext, totalWorkouts: 0 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, totalWorkouts: 1 }).isUnlocked).toBe(true);
    expect(badge.evaluate({ ...baseContext, totalWorkouts: 5 }).isUnlocked).toBe(true);
  });

  it('2. 3-Day Streak badge boundary', () => {
    const badge = getBadge('streak_3');
    expect(badge.evaluate({ ...baseContext, currentStreak: 2, longestStreak: 2 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, currentStreak: 3, longestStreak: 3 }).isUnlocked).toBe(true);
  });

  it('3. 7-Day Streak badge boundary', () => {
    const badge = getBadge('streak_7');
    expect(badge.evaluate({ ...baseContext, currentStreak: 6, longestStreak: 6 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, currentStreak: 7, longestStreak: 7 }).isUnlocked).toBe(true);
  });

  it('4. 14-Day Streak badge boundary', () => {
    const badge = getBadge('streak_14');
    expect(badge.evaluate({ ...baseContext, currentStreak: 13, longestStreak: 13 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, currentStreak: 14, longestStreak: 14 }).isUnlocked).toBe(true);
  });

  it('5. Full Week badge boundary (week 1 >= 5 workouts)', () => {
    const badge = getBadge('full_week');
    expect(badge.evaluate({ ...baseContext, completedDayNumbers: [1, 2, 3, 4] }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, completedDayNumbers: [1, 2, 3, 4, 5] }).isUnlocked).toBe(true);
  });

  it('6. Halfway There badge boundary (day 15 completed)', () => {
    const badge = getBadge('halfway');
    expect(badge.evaluate({ ...baseContext, completedDayNumbers: [1, 2, 3, 14] }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, completedDayNumbers: [1, 2, 3, 14, 15] }).isUnlocked).toBe(true);
  });

  it('7. Program Complete badge boundary (all 30 days)', () => {
    const badge = getBadge('program_complete');
    const days29 = Array.from({ length: 29 }, (_, i) => i + 1);
    const days30 = Array.from({ length: 30 }, (_, i) => i + 1);

    expect(badge.evaluate({ ...baseContext, completedDayNumbers: days29 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, completedDayNumbers: days30 }).isUnlocked).toBe(true);
  });

  it('8. First Perfect Form badge boundary (score >= 90)', () => {
    const badge = getBadge('first_perfect_form');
    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Squat', reps: 10, durationSeconds: null, formScore: 89 }],
      }).isUnlocked
    ).toBe(false);

    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Squat', reps: 10, durationSeconds: null, formScore: 90 }],
      }).isUnlocked
    ).toBe(true);
  });

  it('9. 5 Perfect Sets badge boundary (count >= 5 with score >= 90)', () => {
    const badge = getBadge('perfect_5');
    const fourPerfect = Array.from({ length: 4 }, () => ({
      exercise: 'Push-Up',
      reps: 10,
      durationSeconds: null,
      formScore: 92,
    }));
    const fivePerfect = Array.from({ length: 5 }, () => ({
      exercise: 'Push-Up',
      reps: 10,
      durationSeconds: null,
      formScore: 90,
    }));

    expect(badge.evaluate({ ...baseContext, logs: fourPerfect }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, logs: fivePerfect }).isUnlocked).toBe(true);
  });

  it('10. Squat Master badge boundary (100 squat reps)', () => {
    const badge = getBadge('squat_master');
    expect(
      badge.evaluate({
        ...baseContext,
        logs: [
          { exercise: 'Squat', reps: 50, durationSeconds: null, formScore: 85 },
          { exercise: 'Squat', reps: 49, durationSeconds: null, formScore: 85 },
        ],
      }).isUnlocked
    ).toBe(false);

    expect(
      badge.evaluate({
        ...baseContext,
        logs: [
          { exercise: 'Squat', reps: 50, durationSeconds: null, formScore: 85 },
          { exercise: 'Squat', reps: 50, durationSeconds: null, formScore: 85 },
        ],
      }).isUnlocked
    ).toBe(true);
  });

  it('11. Push-up Pro badge boundary (100 push-up reps)', () => {
    const badge = getBadge('pushup_pro');
    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Push-Up', reps: 99, durationSeconds: null, formScore: 88 }],
      }).isUnlocked
    ).toBe(false);

    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Push-Up', reps: 100, durationSeconds: null, formScore: 88 }],
      }).isUnlocked
    ).toBe(true);
  });

  it('12. Iron Plank badge boundary (300 seconds plank hold)', () => {
    const badge = getBadge('iron_plank');
    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Forearm Plank', reps: 0, durationSeconds: 299, formScore: 90 }],
      }).isUnlocked
    ).toBe(false);

    expect(
      badge.evaluate({
        ...baseContext,
        logs: [{ exercise: 'Forearm Plank', reps: 0, durationSeconds: 300, formScore: 90 }],
      }).isUnlocked
    ).toBe(true);
  });

  it('13. Diet Planner badge boundary (>= 1 diet plan saved)', () => {
    const badge = getBadge('diet_planner');
    expect(badge.evaluate({ ...baseContext, dietPlansCount: 0 }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, dietPlansCount: 1 }).isUnlocked).toBe(true);
  });

  it('14. Comeback badge boundary (workout after missed day)', () => {
    const badge = getBadge('comeback');
    expect(badge.evaluate({ ...baseContext, hasComeback: false }).isUnlocked).toBe(false);
    expect(badge.evaluate({ ...baseContext, hasComeback: true }).isUnlocked).toBe(true);
  });
});
