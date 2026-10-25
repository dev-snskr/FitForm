// src/lib/progress/streakCalculator.ts
// FitForm Streak Engine & Calendar Heatmap Processor
// Rules:
// 1. A day counts as "done" when that plan day's workout is completed (has at least 1 logged set).
// 2. Planned rest and recovery days do NOT break the streak!
// 3. Skipping a planned workout day breaks the streak.
// 4. Uses the user's local date (YYYY-MM-DD), not UTC, handling midnight and timezone boundaries cleanly.
// 5. Detects "at risk" condition when today is an uncompleted planned workout day and a prior streak exists.

export type DayStatus = 'done' | 'rest' | 'missed' | 'upcoming';

export interface PlanDayInfo {
  dayNumber: number;
  workoutType: string;
  isRest: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  formScore?: number | null;
}

export interface WeekDayDot {
  dayName: string; // e.g. "Mon", "Tue"
  dateStr: string; // e.g. "2026-10-25"
  dayNumber?: number;
  status: DayStatus;
  isToday: boolean;
}

export interface ProgramHeatmapNode {
  dayNumber: number;
  workoutType: string;
  isRest: boolean;
  status: DayStatus;
  averageFormScore: number | null;
  completedAt: string | null;
}

export interface StreakAnalysisResult {
  currentStreak: number;
  longestStreak: number;
  totalWorkoutsCompleted: number;
  isStreakAtRisk: boolean;
  streakAtRiskMessage: string | null;
  thisWeek: WeekDayDot[];
  programHeatmap: ProgramHeatmapNode[];
}

/**
 * Converts any Date object to a local YYYY-MM-DD string according to client local timezone.
 */
export function formatToLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight.
 */
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Computes difference in calendar days between two YYYY-MM-DD strings.
 */
export function getCalendarDaysDiff(earlierDateStr: string, laterDateStr: string): number {
  const d1 = parseLocalDateString(earlierDateStr);
  const d2 = parseLocalDateString(laterDateStr);
  const msDiff = d2.getTime() - d1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Main Streak Calculation function.
 * @param planDays Array of 30 program days with plan details & completion state.
 * @param userCreatedDateStr Date when the profile started (YYYY-MM-DD).
 * @param referenceTodayStr Optional today date string for deterministic testing.
 */
export function calculateStreak(
  planDays: PlanDayInfo[],
  userCreatedDateStr?: string,
  referenceTodayStr?: string
): StreakAnalysisResult {
  const todayStr = referenceTodayStr || formatToLocalDateString(new Date());

  // 1. Total workouts completed (non-rest days that are completed)
  const totalWorkoutsCompleted = planDays.filter(
    (d) => !d.isRest && d.isCompleted
  ).length;

  // 2. Identify the highest completed day number
  const completedDays = planDays.filter((d) => d.isCompleted);
  const maxCompletedDayNumber = completedDays.reduce(
    (max, d) => (d.dayNumber > max ? d.dayNumber : max),
    0
  );

  // 3. Construct 30-Day Program Heatmap
  // A day is 'done' if completed.
  // A day is 'rest' if isRest is true and its dayNumber <= maxCompletedDayNumber + 1.
  // A day is 'missed' if it was a workout day before or at current progression that was never completed.
  // A day is 'upcoming' if dayNumber > current active day.
  const programHeatmap: ProgramHeatmapNode[] = planDays.map((p) => {
    let status: DayStatus = 'upcoming';

    if (p.isCompleted) {
      status = 'done';
    } else if (p.isRest) {
      if (p.dayNumber <= maxCompletedDayNumber + 1) {
        status = 'rest';
      } else {
        status = 'upcoming';
      }
    } else {
      // Workout day not completed
      if (p.dayNumber < maxCompletedDayNumber) {
        status = 'missed';
      } else if (p.dayNumber === maxCompletedDayNumber + 1) {
        status = 'upcoming';
      } else {
        status = 'upcoming';
      }
    }

    return {
      dayNumber: p.dayNumber,
      workoutType: p.workoutType,
      isRest: p.isRest,
      status,
      averageFormScore: p.formScore !== undefined ? p.formScore : null,
      completedAt: p.completedAt || null,
    };
  });

  // 4. Consecutive Streak & Longest Streak Calculation along the plan sequence:
  // Rule:
  // - Walking sequentially from Day 1 to Day 30:
  // - Completed workout day (+1 to streak)
  // - Planned rest day (+1 to streak if prior day was active; rest days do NOT break streak)
  // - Missed workout day (breaks streak, resets to 0)
  let currentRunningStreak = 0;
  let longestStreak = 0;
  let activeStreak = 0;

  for (let i = 0; i < planDays.length; i++) {
    const day = planDays[i];

    if (day.isCompleted) {
      // Completed workout
      currentRunningStreak += 1;
      if (currentRunningStreak > longestStreak) {
        longestStreak = currentRunningStreak;
      }
    } else if (day.isRest) {
      // Rest day: if we are currently on an active streak, rest day extends/maintains it
      if (currentRunningStreak > 0 && day.dayNumber <= maxCompletedDayNumber) {
        currentRunningStreak += 1;
        if (currentRunningStreak > longestStreak) {
          longestStreak = currentRunningStreak;
        }
      }
    } else {
      // Workout day not completed
      if (day.dayNumber <= maxCompletedDayNumber) {
        // Was skipped/missed prior to latest workout
        currentRunningStreak = 0;
      } else {
        // We have reached beyond current progress
        break;
      }
    }
  }

  // Active streak is currentRunningStreak up to current progress
  activeStreak = currentRunningStreak;

  // 5. Today's "At Risk" condition:
  // If the user has an active streak (> 0), and the next scheduled day is today and is a workout day
  // that has NOT been completed yet today.
  const nextDay = planDays.find((d) => !d.isCompleted && !d.isRest);
  let isStreakAtRisk = false;
  let streakAtRiskMessage: string | null = null;

  // Check if today has a logged workout
  const hasLoggedToday = planDays.some(
    (d) => d.completedAt && formatToLocalDateString(new Date(d.completedAt)) === todayStr
  );

  if (activeStreak > 0 && !hasLoggedToday && nextDay) {
    isStreakAtRisk = true;
    streakAtRiskMessage = `Your ${activeStreak}-day streak is on the line today! Complete Day ${nextDay.dayNumber} to keep the flame alive.`;
  }

  // 6. Build "This Week" (last 7 calendar days ending today)
  const thisWeek: WeekDayDot[] = [];
  const todayDate = parseLocalDateString(todayStr);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let offset = 6; offset >= 0; offset--) {
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() - offset);
    const dateStr = formatToLocalDateString(targetDate);
    const dayName = dayNames[targetDate.getDay()];
    const isToday = offset === 0;

    // Check if any plan day was completed on this calendar date
    const matchedCompleted = planDays.find(
      (d) => d.completedAt && formatToLocalDateString(new Date(d.completedAt)) === dateStr
    );

    let status: DayStatus = 'upcoming';

    if (matchedCompleted) {
      status = 'done';
    } else if (offset > 0) {
      // Past days: check if user profile was created by this date
      if (userCreatedDateStr && dateStr < userCreatedDateStr) {
        status = 'upcoming'; // Before profile existed
      } else {
        // Was this day a rest day or missed?
        status = 'rest';
      }
    } else {
      // Today
      status = isStreakAtRisk ? 'upcoming' : 'upcoming';
    }

    thisWeek.push({
      dayName,
      dateStr,
      status,
      isToday,
    });
  }

  return {
    currentStreak: activeStreak,
    longestStreak,
    totalWorkoutsCompleted,
    isStreakAtRisk,
    streakAtRiskMessage,
    thisWeek,
    programHeatmap,
  };
}
