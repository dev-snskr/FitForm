// src/lib/progress/metricsCalculator.ts
// FitForm Real Metrics Engine & Scientific Analytics Formulas
// All formulas are fully documented and deterministic (zero AI calls).
//
// Metrics Included:
// 1. Consistency (% of planned workouts completed so far + weekly adherence bars)
// 2. Strength & Volume (reps * loadKg, or reps for bodyweight, plus Personal Records)
// 3. Form Accuracy & Technique Shifts (earlier vs recent mistake frequency comparison)
// 4. Body Progression & Projected Goal Date (with 1% bodyweight safety velocity check)
// 5. Estimated Calories Burned (via Compendium METs * weight * hours)
// 6. Plain-language Rule-Based Insights & Data Quality diagnostics

import { getMetForExercise, calculateEstimatedCalories } from './metValues';
import { formatToLocalDateString, parseLocalDateString } from './streakCalculator';

export interface RawLogItem {
  id?: number;
  dayNumber: number;
  exercise: string;
  setNumber?: number;
  reps: number;
  loadKg?: number | null;
  durationSeconds?: number | null;
  formScore?: number | null;
  mistakes?: string | null;
  restSeconds?: number | null;
  completedAt: Date | string;
}

export interface RawWeightEntry {
  id?: number;
  date: string;
  weightKg: number;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  armCm?: number | null;
  recordedAt?: Date | string;
}

export interface PlanDayRef {
  dayNumber: number;
  workoutType?: string;
  isRest: boolean;
}

export interface PersonalRecord {
  exercise: string;
  bestReps: number;
  bestLoadKg: number | null;
  achievedDate: string;
  isNew: boolean;
}

export interface PersonalRecordItem {
  type: 'best_volume_set' | 'most_reps' | 'longest_plank' | 'best_form';
  title: string;
  exercise: string;
  valueDisplay: string;
  numericValue: number;
  date: string;
  setDetails: string;
}

export interface MistakeShiftItem {
  mistake: string;
  totalCount: number;
  earlyCount: number;
  recentCount: number;
  trend: 'improving' | 'worsening' | 'stable';
  shiftPercentage: number;
}

export interface GoalProjectionResult {
  hasEnoughData: boolean;
  message?: string;
  projectedDate?: string | null;
  weeksRemaining?: number;
  weeklyRateKg?: number;
  isVelocityTooFast?: boolean;
  velocityWarning?: string | null;
}

export interface InsightItem {
  type: 'flawless' | 'improved' | 'streak' | 'warning' | 'milestone' | 'info';
  text: string;
}

export interface UserMetricsResult {
  timeRange: '7d' | '30d' | 'all';
  consistency: {
    consistencyPercentage: number;
    scorePercentage: number;
    completedWorkouts: number;
    plannedWorkouts: number;
    plannedWorkoutsSoFar: number;
    weeklyAdherence: {
      week: string;
      weekNumber: number;
      completed: number;
      planned: number;
      percentage: number;
    }[];
  };
  strength: {
    totalVolumeKg: number;
    totalReps: number;
    personalRecords: PersonalRecord[];
    legacyRecords: PersonalRecordItem[];
    weeklyTrends: {
      week: string;
      weekNumber: number;
      volumeKg: number;
      reps: number;
      plankSeconds: number;
      workoutsCompleted: number;
      workoutsPlanned: number;
    }[];
    weightedSetsCount: number;
    bodyweightSetsCount: number;
  };
  strengthVolume: {
    totalVolumeKg: number;
    totalReps: number;
    personalRecords: PersonalRecordItem[];
    exerciseVolumeByWeek: Record<string, { week: string; volume: number; reps: number }[]>;
  };
  form: {
    averageScore: number | null;
    perExerciseScores: Record<string, number>;
    exerciseScores: Record<string, { dayNumber: number; date: string; score: number }[]>;
    topMistakes: MistakeShiftItem[];
    mistakeShift: {
      earlierTopMistakes: { mistake: string; count: number }[];
      recentTopMistakes: { mistake: string; count: number }[];
      eliminatedMistakes: string[];
      persistingMistakes: string[];
    } | null;
    canAnalyzeMistakeTrends: boolean;
    mistakeTrendNote?: string;
  };
  formMastery: {
    averageFormScore: number | null;
    exerciseScores: Record<string, { dayNumber: number; date: string; score: number }[]>;
    topMistakes: MistakeShiftItem[];
    canAnalyzeMistakeTrends: boolean;
    mistakeTrendNote?: string;
  };
  body: {
    startWeightKg: number;
    currentWeightKg: number;
    changeKg: number;
    targetWeightKg: number | null;
    targetProgressPercentage: number | null;
    projectedGoalDate: string | null;
    projectionReason: string;
    isRateHealthy: boolean;
    healthyRateWarning: string | null;
    weeklyChangeKg: number | null;
    measurementsHistory: {
      date: string;
      weightKg: number;
      waistCm?: number | null;
      chestCm?: number | null;
      hipsCm?: number | null;
      armCm?: number | null;
    }[];
    startWaist: number | null;
    currentWaist: number | null;
    waistDelta: number | null;
  };
  bodyProgress: {
    startWeight: number;
    currentWeight: number;
    weightDelta: number;
    targetWeight: number | null;
    targetProgressPercentage: number | null;
    weightEntriesCount: number;
    projection: GoalProjectionResult;
    measurementsHistory: {
      date: string;
      weightKg: number;
      waistCm?: number | null;
      chestCm?: number | null;
      hipsCm?: number | null;
      armCm?: number | null;
    }[];
    startWaist: number | null;
    currentWaist: number | null;
    waistDelta: number | null;
  };
  calories: {
    totalCalories: number;
    totalEstimatedCalories: number;
    averageCaloriesPerWorkout: number;
    activeMinutes: number;
    isEstimated: boolean;
    sessionCalories: {
      dayNumber: number;
      date: string;
      durationMinutes: number;
      estimatedCalories: number;
    }[];
  };
  insights: InsightItem[];
  dataQuality: {
    hasEnoughWeighInsForProjection: boolean;
    hasEnoughSessionsForMistakeShift: boolean;
    hasExternalLoadData: boolean;
  };
}

/**
 * Parses mistakes JSON or comma-separated string safely.
 */
export function parseMistakesList(mistakesStr: string | null | undefined): string[] {
  if (!mistakesStr) return [];
  try {
    if (mistakesStr.startsWith('[')) {
      const arr = JSON.parse(mistakesStr);
      return Array.isArray(arr) ? arr.map(String).map((s) => s.trim()).filter(Boolean) : [];
    }
    return mistakesStr.split(',').map((s) => s.trim()).filter(Boolean);
  } catch {
    return mistakesStr.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

/**
 * 1. Consistency & Adherence
 */
export function calculateConsistency(
  workoutDays: PlanDayRef[],
  completedDays: Set<number> | Map<number, unknown>
): {
  consistencyPercentage: number;
  plannedWorkouts: number;
  completedWorkouts: number;
  weeklyAdherence: {
    week: string;
    weekNumber: number;
    completed: number;
    planned: number;
    percentage: number;
  }[];
} {
  const completedSet = completedDays instanceof Set ? completedDays : new Set(completedDays.keys());

  const plannedNonRest = workoutDays.filter((d) => !d.isRest);
  const plannedCount = plannedNonRest.length;
  const completedCount = plannedNonRest.filter((d) => completedSet.has(d.dayNumber)).length;

  const consistencyPercentage =
    plannedCount === 0 ? 100 : Math.min(100, Math.round((completedCount / plannedCount) * 100));

  const weeklyAdherence = [];
  for (let w = 1; w <= 5; w++) {
    const startDay = (w - 1) * 6 + 1;
    const endDay = Math.min(30, w * 6);
    const weekPlans = workoutDays.filter(
      (p) => p.dayNumber >= startDay && p.dayNumber <= endDay && !p.isRest
    );
    const completed = weekPlans.filter((p) => completedSet.has(p.dayNumber)).length;
    const planned = weekPlans.length;
    weeklyAdherence.push({
      week: `Week ${w}`,
      weekNumber: w,
      completed,
      planned,
      percentage: planned > 0 ? Math.round((completed / planned) * 100) : 0,
    });
  }

  return {
    consistencyPercentage,
    plannedWorkouts: plannedCount,
    completedWorkouts: completedCount,
    weeklyAdherence,
  };
}

/**
 * 2. Strength Volume & Personal Records
 */
export function calculateStrengthVolume(logs: RawLogItem[]): {
  totalVolumeKg: number;
  totalReps: number;
  weightedSetsCount: number;
  bodyweightSetsCount: number;
  weeklyTrends: {
    week: string;
    weekNumber: number;
    volumeKg: number;
    reps: number;
    plankSeconds: number;
    workoutsCompleted: number;
    workoutsPlanned: number;
  }[];
} {
  let totalVolumeKg = 0;
  let totalReps = 0;
  let weightedSetsCount = 0;
  let bodyweightSetsCount = 0;

  logs.forEach((l) => {
    const reps = l.reps || 0;
    totalReps += reps;

    if (l.loadKg && l.loadKg > 0) {
      totalVolumeKg += reps * l.loadKg;
      weightedSetsCount += 1;
    } else {
      totalVolumeKg += reps; // Bodyweight reps
      bodyweightSetsCount += 1;
    }
  });

  const weeklyTrends = [];
  for (let w = 1; w <= 5; w++) {
    const startDay = (w - 1) * 6 + 1;
    const endDay = Math.min(30, w * 6);
    const weekLogs = logs.filter((l) => l.dayNumber >= startDay && l.dayNumber <= endDay);

    let weekVol = 0;
    let weekReps = 0;
    let weekPlankSecs = 0;
    const distinctDays = new Set<number>();

    weekLogs.forEach((l) => {
      distinctDays.add(l.dayNumber);
      const reps = l.reps || 0;
      weekReps += reps;
      weekPlankSecs += l.durationSeconds || 0;
      if (l.loadKg && l.loadKg > 0) {
        weekVol += reps * l.loadKg;
      } else {
        weekVol += reps;
      }
    });

    weeklyTrends.push({
      week: `Week ${w}`,
      weekNumber: w,
      volumeKg: Math.round(weekVol),
      reps: weekReps,
      plankSeconds: weekPlankSecs,
      workoutsCompleted: distinctDays.size,
      workoutsPlanned: 5,
    });
  }

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    totalReps,
    weightedSetsCount,
    bodyweightSetsCount,
    weeklyTrends,
  };
}

/**
 * Personal Records Calculation per Exercise
 */
export function calculatePersonalRecords(logs: RawLogItem[]): PersonalRecord[] {
  const prMap = new Map<
    string,
    { bestReps: number; bestLoadKg: number | null; achievedAt: Date }
  >();

  logs.forEach((l) => {
    const ex = l.exercise.trim();
    const curr = prMap.get(ex) || {
      bestReps: 0,
      bestLoadKg: null,
      achievedAt: new Date(0),
    };

    const isPlank = ex.toLowerCase().includes('plank');
    const metricValue = isPlank ? l.durationSeconds || l.reps : l.reps;
    const load = l.loadKg && l.loadKg > 0 ? l.loadKg : null;
    const completedDate = new Date(l.completedAt);

    let isBetter = false;
    if (load !== null && (curr.bestLoadKg === null || load > curr.bestLoadKg)) {
      isBetter = true;
    } else if (load === curr.bestLoadKg && metricValue > curr.bestReps) {
      isBetter = true;
    } else if (curr.bestLoadKg === null && metricValue > curr.bestReps) {
      isBetter = true;
    }

    if (isBetter) {
      prMap.set(ex, {
        bestReps: metricValue,
        bestLoadKg: load,
        achievedAt: completedDate,
      });
    }
  });

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return Array.from(prMap.entries()).map(([exercise, data]) => {
    const isNew = now - data.achievedAt.getTime() <= sevenDaysMs;
    return {
      exercise,
      bestReps: data.bestReps,
      bestLoadKg: data.bestLoadKg,
      achievedDate: formatToLocalDateString(data.achievedAt),
      isNew,
    };
  });
}

/**
 * 3. Form Trends & Technique Shift (earlier vs recent sessions)
 */
export function calculateFormTrends(logs: RawLogItem[]): {
  averageScore: number | null;
  perExerciseScores: Record<string, number>;
  exerciseScores: Record<string, { dayNumber: number; date: string; score: number }[]>;
  topMistakes: MistakeShiftItem[];
  mistakeShift: {
    earlierTopMistakes: { mistake: string; count: number }[];
    recentTopMistakes: { mistake: string; count: number }[];
    eliminatedMistakes: string[];
    persistingMistakes: string[];
  } | null;
} {
  const scoredLogs = logs.filter((l) => l.formScore !== null && l.formScore !== undefined);

  const averageScore =
    scoredLogs.length > 0
      ? Math.round(scoredLogs.reduce((acc, l) => acc + (l.formScore || 0), 0) / scoredLogs.length)
      : null;

  const perExerciseScores: Record<string, number> = {};
  const exerciseScores: Record<string, { dayNumber: number; date: string; score: number }[]> = {};

  ['Squat', 'Push-Up', 'Bicep Curl', 'Lunge', 'Plank'].forEach((ex) => {
    const exLogs = scoredLogs.filter((l) =>
      l.exercise.toLowerCase().replace(/[-_\s]/g, '').includes(ex.toLowerCase().replace(/[-_\s]/g, ''))
    );
    if (exLogs.length > 0) {
      const avg = Math.round(
        exLogs.reduce((acc, l) => acc + (l.formScore || 0), 0) / exLogs.length
      );
      perExerciseScores[ex] = avg;
    }
    exerciseScores[ex] = exLogs.map((l) => ({
      dayNumber: l.dayNumber,
      date: formatToLocalDateString(new Date(l.completedAt)),
      score: Math.round(l.formScore || 0),
    }));
  });

  // Evaluate distinct completed days with scores
  const distinctDays = Array.from(new Set(scoredLogs.map((l) => l.dayNumber))).sort((a, b) => a - b);

  if (distinctDays.length < 3) {
    // Need at least 3 scored workout sessions
    return {
      averageScore,
      perExerciseScores,
      exerciseScores,
      topMistakes: [],
      mistakeShift: null,
    };
  }

  const midpointDay = distinctDays[Math.floor(distinctDays.length / 2)];
  const earlyMistakes = new Map<string, number>();
  const recentMistakes = new Map<string, number>();

  scoredLogs.forEach((l) => {
    const parsed = parseMistakesList(l.mistakes);
    parsed.forEach((m) => {
      if (l.dayNumber <= midpointDay) {
        earlyMistakes.set(m, (earlyMistakes.get(m) || 0) + 1);
      } else {
        recentMistakes.set(m, (recentMistakes.get(m) || 0) + 1);
      }
    });
  });

  const eliminatedMistakes: string[] = [];
  const persistingMistakes: string[] = [];
  const topMistakes: MistakeShiftItem[] = [];

  const allMistakeKeys = Array.from(
    new Set([...Array.from(earlyMistakes.keys()), ...Array.from(recentMistakes.keys())])
  );

  allMistakeKeys.forEach((m) => {
    const early = earlyMistakes.get(m) || 0;
    const recent = recentMistakes.get(m) || 0;
    const total = early + recent;

    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    let shiftPercentage = 0;

    if (early > 0 && recent === 0) {
      eliminatedMistakes.push(m);
      trend = 'improving';
      shiftPercentage = 100;
    } else if (recent < early) {
      trend = 'improving';
      shiftPercentage = Math.round(((early - recent) / early) * 100);
      persistingMistakes.push(m);
    } else if (recent > early && early > 0) {
      trend = 'worsening';
      shiftPercentage = Math.round(((recent - early) / early) * 100);
      persistingMistakes.push(m);
    } else {
      persistingMistakes.push(m);
    }

    topMistakes.push({
      mistake: m,
      totalCount: total,
      earlyCount: early,
      recentCount: recent,
      trend,
      shiftPercentage,
    });
  });

  topMistakes.sort((a, b) => b.totalCount - a.totalCount);

  return {
    averageScore,
    perExerciseScores,
    exerciseScores,
    topMistakes: topMistakes.slice(0, 5),
    mistakeShift: {
      earlierTopMistakes: Array.from(earlyMistakes.entries())
        .map(([mistake, count]) => ({ mistake, count }))
        .sort((a, b) => b.count - a.count),
      recentTopMistakes: Array.from(recentMistakes.entries())
        .map(([mistake, count]) => ({ mistake, count }))
        .sort((a, b) => b.count - a.count),
      eliminatedMistakes,
      persistingMistakes,
    },
  };
}

/**
 * 4. Body Progress & Goal Projection
 */
export function calculateBodyProgress(
  weightEntries: RawWeightEntry[],
  targetWeightKg?: number | null,
  goal = 'general_fitness'
): {
  startWeightKg: number;
  currentWeightKg: number;
  changeKg: number;
  targetWeightKg: number | null;
  targetProgressPercentage: number | null;
  projectedGoalDate: string | null;
  projectionReason: string;
  isRateHealthy: boolean;
  healthyRateWarning: string | null;
  weeklyChangeKg: number | null;
} {
  const sorted = [...weightEntries].sort(
    (a, b) => parseLocalDateString(a.date).getTime() - parseLocalDateString(b.date).getTime()
  );

  if (sorted.length === 0) {
    return {
      startWeightKg: 75,
      currentWeightKg: 75,
      changeKg: 0,
      targetWeightKg: targetWeightKg ?? null,
      targetProgressPercentage: null,
      projectedGoalDate: null,
      projectionReason: 'No weigh-ins logged yet.',
      isRateHealthy: true,
      healthyRateWarning: null,
      weeklyChangeKg: null,
    };
  }

  const startWeightKg = sorted[0].weightKg;
  const currentWeightKg = sorted[sorted.length - 1].weightKg;
  const changeKg = Number((currentWeightKg - startWeightKg).toFixed(1));

  let targetProgressPercentage: number | null = null;
  if (targetWeightKg && Math.abs(startWeightKg - targetWeightKg) > 0.1) {
    const totalDistance = Math.abs(startWeightKg - targetWeightKg);
    const coveredDistance = Math.abs(currentWeightKg - startWeightKg);
    targetProgressPercentage = Math.min(100, Math.round((coveredDistance / totalDistance) * 100));
  }

  // Projection condition: >= 3 weigh-ins AND >= 7 days elapsed
  if (sorted.length < 3) {
    return {
      startWeightKg,
      currentWeightKg,
      changeKg,
      targetWeightKg: targetWeightKg ?? null,
      targetProgressPercentage,
      projectedGoalDate: null,
      projectionReason: 'Requires at least 3 weigh-ins to establish an accurate trend.',
      isRateHealthy: true,
      healthyRateWarning: null,
      weeklyChangeKg: null,
    };
  }

  const firstDate = parseLocalDateString(sorted[0].date);
  const lastDate = parseLocalDateString(sorted[sorted.length - 1].date);
  const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 7) {
    return {
      startWeightKg,
      currentWeightKg,
      changeKg,
      targetWeightKg: targetWeightKg ?? null,
      targetProgressPercentage,
      projectedGoalDate: null,
      projectionReason: `Weigh-ins currently span ${Math.round(daysDiff)} days. Requires at least 7 days between first and latest weigh-in to project goal date.`,
      isRateHealthy: true,
      healthyRateWarning: null,
      weeklyChangeKg: null,
    };
  }

  const weeksElapsed = daysDiff / 7;
  const weeklyChangeKg = Number(((currentWeightKg - startWeightKg) / weeksElapsed).toFixed(2));

  // Safe velocity check: weekly change > 1% of bodyweight
  const maxSafeWeeklyChange = Number((currentWeightKg * 0.01).toFixed(2));
  const isRateHealthy = Math.abs(weeklyChangeKg) <= maxSafeWeeklyChange;
  const healthyRateWarning = !isRateHealthy
    ? `Rate of weight change exceeds 1.0% bodyweight per week (${Math.abs(weeklyChangeKg)} kg/wk vs safe cap of ${maxSafeWeeklyChange} kg/wk). Consider a more gradual pace for long-term health and muscle preservation.`
    : null;

  if (!targetWeightKg) {
    return {
      startWeightKg,
      currentWeightKg,
      changeKg,
      targetWeightKg: null,
      targetProgressPercentage,
      projectedGoalDate: null,
      projectionReason: 'Set a target weight in your profile to calculate projected completion date.',
      isRateHealthy,
      healthyRateWarning,
      weeklyChangeKg,
    };
  }

  const isLossGoal = targetWeightKg < startWeightKg || goal.toLowerCase().includes('loss');
  const isProgressing = isLossGoal ? weeklyChangeKg < -0.05 : weeklyChangeKg > 0.05;

  if (!isProgressing) {
    return {
      startWeightKg,
      currentWeightKg,
      changeKg,
      targetWeightKg,
      targetProgressPercentage,
      projectedGoalDate: null,
      projectionReason: 'Weight is currently steady. Continue tracking your routine to establish a clear directional trend.',
      isRateHealthy,
      healthyRateWarning,
      weeklyChangeKg,
    };
  }

  const remainingKg = Math.abs(targetWeightKg - currentWeightKg);
  const weeksRemaining = remainingKg / Math.abs(weeklyChangeKg);
  const projectedTimestamp = lastDate.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000;
  const projectedGoalDate = formatToLocalDateString(new Date(projectedTimestamp));

  return {
    startWeightKg,
    currentWeightKg,
    changeKg,
    targetWeightKg,
    targetProgressPercentage,
    projectedGoalDate,
    projectionReason: `At your steady rate of ${Math.abs(weeklyChangeKg)} kg/week, you are on track to reach ${targetWeightKg} kg.`,
    isRateHealthy,
    healthyRateWarning,
    weeklyChangeKg,
  };
}

/**
 * 5. Compendium MET Calorie Estimation
 */
export function calculateCalorieBurn(
  logs: RawLogItem[],
  bodyWeightKg: number
): {
  totalCalories: number;
  activeMinutes: number;
  isEstimated: boolean;
  sessionCalories: {
    dayNumber: number;
    date: string;
    durationMinutes: number;
    estimatedCalories: number;
  }[];
} {
  const logsByDay = new Map<number, RawLogItem[]>();
  logs.forEach((l) => {
    const list = logsByDay.get(l.dayNumber) || [];
    list.push(l);
    logsByDay.set(l.dayNumber, list);
  });

  let totalCalories = 0;
  let totalActiveMinutes = 0;
  const sessionCalories: {
    dayNumber: number;
    date: string;
    durationMinutes: number;
    estimatedCalories: number;
  }[] = [];

  logsByDay.forEach((dayLogs, dayNum) => {
    if (dayLogs.length === 0) return;
    const firstLog = dayLogs[0];
    const lastLog = dayLogs[dayLogs.length - 1];

    const firstTime = firstLog.completedAt
      ? new Date(firstLog.completedAt).getTime()
      : Date.now();
    const lastTime = lastLog.completedAt
      ? new Date(lastLog.completedAt).getTime()
      : firstTime + (dayLogs.length * 2 * 60 * 1000);
    const finalRestMs = (lastLog.restSeconds || 60) * 1000;

    const sessionDurationMs = !isNaN(lastTime - firstTime) && lastTime >= firstTime
      ? Math.max(10 * 60 * 1000, lastTime - firstTime + finalRestMs)
      : dayLogs.length * 3 * 60 * 1000;
    const durationMinutes = Math.max(10, Math.round(sessionDurationMs / (60 * 1000)));
    totalActiveMinutes += durationMinutes;

    const metSum = dayLogs.reduce((acc, l) => acc + getMetForExercise(l.exercise), 0);
    const avgMet = dayLogs.length > 0 ? metSum / dayLogs.length : 4.8;

    const burned = calculateEstimatedCalories(durationMinutes, bodyWeightKg, avgMet);
    totalCalories += burned;

    sessionCalories.push({
      dayNumber: dayNum,
      date: firstLog.completedAt
        ? formatToLocalDateString(new Date(firstLog.completedAt))
        : formatToLocalDateString(new Date()),
      durationMinutes,
      estimatedCalories: burned,
    });
  });

  return {
    totalCalories,
    activeMinutes: totalActiveMinutes,
    isEstimated: true,
    sessionCalories,
  };
}

/**
 * 6. Rule-Based Plain-Language Insights (0 AI)
 */
export function generateInsights(
  consistency: { consistencyPercentage: number; completedWorkouts: number; plannedWorkouts: number },
  strength: { totalVolumeKg: number; totalReps: number; personalRecords: PersonalRecord[] },
  form: {
    averageScore: number | null;
    mistakeShift: {
      eliminatedMistakes: string[];
      earlierTopMistakes?: { mistake: string; count: number }[];
      recentTopMistakes?: { mistake: string; count: number }[];
      persistingMistakes?: string[];
    } | null;
  },
  body: { currentWeightKg: number; changeKg: number; projectedGoalDate: string | null; healthyRateWarning: string | null },
  completedCount: number
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (consistency.consistencyPercentage === 100) {
    insights.push({
      type: 'streak',
      text: 'Flawless 100% workout consistency! You have completed every scheduled session without missing a day.',
    });
  } else if (consistency.consistencyPercentage >= 80) {
    insights.push({
      type: 'streak',
      text: `Strong consistency at ${consistency.consistencyPercentage}%. Staying on track builds compounding strength.`,
    });
  }

  if (form.averageScore !== null && form.averageScore >= 90) {
    insights.push({
      type: 'flawless',
      text: `Flawless technique: your average form score is ${form.averageScore}%, showcasing superb computer vision alignment.`,
    });
  }

  if (form.mistakeShift && form.mistakeShift.eliminatedMistakes.length > 0) {
    const eliminated = form.mistakeShift.eliminatedMistakes[0];
    insights.push({
      type: 'improved',
      text: `Great progress: you eliminated "${eliminated}" in your recent workouts!`,
    });
  }

  const newPR = strength.personalRecords.find((p) => p.isNew);
  if (newPR) {
    insights.push({
      type: 'milestone',
      text: `New Personal Record on ${newPR.exercise}: ${newPR.bestReps} reps achieved this week!`,
    });
  }

  if (body.healthyRateWarning) {
    insights.push({
      type: 'warning',
      text: body.healthyRateWarning,
    });
  } else if (body.projectedGoalDate) {
    insights.push({
      type: 'info',
      text: `On track: at your steady pacing, your estimated target completion date is ${body.projectedGoalDate}.`,
    });
  }

  if (insights.length < 3) {
    insights.push({
      type: 'info',
      text: `You have completed ${completedCount} workout sessions and moved ${strength.totalVolumeKg.toLocaleString()} kg of cumulative volume.`,
    });
  }

  return insights.slice(0, 5);
}

/**
 * Main Calculation Engine unifying all metrics.
 * Supports both options object or positional parameters.
 */
export function calculateUserMetrics(
  inputOrLogs:
    | {
        user: {
          id: number;
          name: string;
          weightKg: number;
          targetWeightKg?: number | null;
          waistCm?: number | null;
          goal: string;
          createdAt: Date | string;
        };
        workoutDays: PlanDayRef[];
        logs: RawLogItem[];
        weightEntries: RawWeightEntry[];
        timeRange?: '7d' | '30d' | 'all';
      }
    | RawLogItem[],
  posWeightEntries?: RawWeightEntry[],
  posPlanDays?: PlanDayRef[],
  posUserProfile?: {
    weightKg: number;
    targetWeightKg?: number | null;
    waistCm?: number | null;
    goal: string;
  }
): UserMetricsResult {
  let user: {
    id?: number;
    name?: string;
    weightKg: number;
    targetWeightKg?: number | null;
    waistCm?: number | null;
    goal: string;
  };
  let workoutDays: PlanDayRef[];
  let logs: RawLogItem[];
  let weightEntries: RawWeightEntry[];
  let timeRange: '7d' | '30d' | 'all' = 'all';

  if (Array.isArray(inputOrLogs)) {
    logs = inputOrLogs;
    weightEntries = posWeightEntries || [];
    workoutDays = posPlanDays || [];
    user = posUserProfile || { weightKg: 75, goal: 'general_fitness' };
  } else {
    logs = inputOrLogs.logs;
    weightEntries = inputOrLogs.weightEntries;
    workoutDays = inputOrLogs.workoutDays;
    user = inputOrLogs.user;
    timeRange = inputOrLogs.timeRange || 'all';
  }

  // Filter logs & weights by time range if specified
  const now = Date.now();
  let filteredLogs = [...logs];
  let filteredWeights = [...weightEntries];

  if (timeRange === '7d') {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    filteredLogs = logs.filter((l) => new Date(l.completedAt).getTime() >= cutoff);
    filteredWeights = weightEntries.filter((w) => parseLocalDateString(w.date).getTime() >= cutoff);
  } else if (timeRange === '30d') {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    filteredLogs = logs.filter((l) => new Date(l.completedAt).getTime() >= cutoff);
    filteredWeights = weightEntries.filter((w) => parseLocalDateString(w.date).getTime() >= cutoff);
  }

  const completedDaysSet = new Set(filteredLogs.map((l) => l.dayNumber));

  const consistencyRes = calculateConsistency(workoutDays, completedDaysSet);
  const strengthRes = calculateStrengthVolume(filteredLogs);
  const prs = calculatePersonalRecords(filteredLogs);
  const formRes = calculateFormTrends(filteredLogs);
  const bodyRes = calculateBodyProgress(filteredWeights, user.targetWeightKg, user.goal);
  const caloriesRes = calculateCalorieBurn(filteredLogs, user.weightKg);

  const insights = generateInsights(
    consistencyRes,
    { totalVolumeKg: strengthRes.totalVolumeKg, totalReps: strengthRes.totalReps, personalRecords: prs },
    formRes,
    { currentWeightKg: bodyRes.currentWeightKg, changeKg: bodyRes.changeKg, projectedGoalDate: bodyRes.projectedGoalDate, healthyRateWarning: bodyRes.healthyRateWarning },
    consistencyRes.completedWorkouts
  );

  // Legacy records for backward compatibility
  const legacyRecords: PersonalRecordItem[] = prs.map((pr) => ({
    type: 'best_volume_set',
    title: `Best on ${pr.exercise}`,
    exercise: pr.exercise,
    valueDisplay: pr.bestLoadKg ? `${pr.bestReps} reps @ ${pr.bestLoadKg} kg` : `${pr.bestReps} reps`,
    numericValue: pr.bestReps,
    date: pr.achievedDate,
    setDetails: `${pr.bestReps} reps`,
  }));

  const sortedWeights = [...filteredWeights].sort(
    (a, b) => parseLocalDateString(a.date).getTime() - parseLocalDateString(b.date).getTime()
  );
  const waistEntries = sortedWeights.filter((w) => w.waistCm !== null && w.waistCm !== undefined);
  const startWaist = waistEntries[0]?.waistCm ?? user.waistCm ?? null;
  const currentWaist = waistEntries[waistEntries.length - 1]?.waistCm ?? user.waistCm ?? null;
  const waistDelta =
    startWaist !== null && currentWaist !== null ? Number((currentWaist - startWaist).toFixed(1)) : null;

  return {
    timeRange,
    consistency: {
      consistencyPercentage: consistencyRes.consistencyPercentage,
      scorePercentage: consistencyRes.consistencyPercentage,
      completedWorkouts: consistencyRes.completedWorkouts,
      plannedWorkouts: consistencyRes.plannedWorkouts,
      plannedWorkoutsSoFar: consistencyRes.plannedWorkouts,
      weeklyAdherence: consistencyRes.weeklyAdherence,
    },
    strength: {
      totalVolumeKg: strengthRes.totalVolumeKg,
      totalReps: strengthRes.totalReps,
      personalRecords: prs,
      legacyRecords,
      weeklyTrends: strengthRes.weeklyTrends,
      weightedSetsCount: strengthRes.weightedSetsCount,
      bodyweightSetsCount: strengthRes.bodyweightSetsCount,
    },
    strengthVolume: {
      totalVolumeKg: strengthRes.totalVolumeKg,
      totalReps: strengthRes.totalReps,
      personalRecords: legacyRecords,
      exerciseVolumeByWeek: {},
    },
    form: {
      averageScore: formRes.averageScore,
      perExerciseScores: formRes.perExerciseScores,
      exerciseScores: formRes.exerciseScores,
      topMistakes: formRes.topMistakes,
      mistakeShift: formRes.mistakeShift,
      canAnalyzeMistakeTrends: formRes.mistakeShift !== null,
    },
    formMastery: {
      averageFormScore: formRes.averageScore,
      exerciseScores: formRes.exerciseScores,
      topMistakes: formRes.topMistakes,
      canAnalyzeMistakeTrends: formRes.mistakeShift !== null,
    },
    body: {
      startWeightKg: bodyRes.startWeightKg,
      currentWeightKg: bodyRes.currentWeightKg,
      changeKg: bodyRes.changeKg,
      targetWeightKg: bodyRes.targetWeightKg,
      targetProgressPercentage: bodyRes.targetProgressPercentage,
      projectedGoalDate: bodyRes.projectedGoalDate,
      projectionReason: bodyRes.projectionReason,
      isRateHealthy: bodyRes.isRateHealthy,
      healthyRateWarning: bodyRes.healthyRateWarning,
      weeklyChangeKg: bodyRes.weeklyChangeKg,
      measurementsHistory: sortedWeights.map((w) => ({
        date: w.date,
        weightKg: w.weightKg,
        waistCm: w.waistCm,
        chestCm: w.chestCm,
        hipsCm: w.hipsCm,
        armCm: w.armCm,
      })),
      startWaist,
      currentWaist,
      waistDelta,
    },
    bodyProgress: {
      startWeight: bodyRes.startWeightKg,
      currentWeight: bodyRes.currentWeightKg,
      weightDelta: bodyRes.changeKg,
      targetWeight: bodyRes.targetWeightKg,
      targetProgressPercentage: bodyRes.targetProgressPercentage,
      weightEntriesCount: sortedWeights.length,
      projection: {
        hasEnoughData: bodyRes.projectedGoalDate !== null,
        message: bodyRes.projectionReason,
        projectedDate: bodyRes.projectedGoalDate,
        isVelocityTooFast: !bodyRes.isRateHealthy,
        velocityWarning: bodyRes.healthyRateWarning,
      },
      measurementsHistory: sortedWeights.map((w) => ({
        date: w.date,
        weightKg: w.weightKg,
        waistCm: w.waistCm,
        chestCm: w.chestCm,
        hipsCm: w.hipsCm,
        armCm: w.armCm,
      })),
      startWaist,
      currentWaist,
      waistDelta,
    },
    calories: {
      totalCalories: caloriesRes.totalCalories,
      totalEstimatedCalories: caloriesRes.totalCalories,
      averageCaloriesPerWorkout:
        caloriesRes.sessionCalories.length > 0
          ? Math.round(caloriesRes.totalCalories / caloriesRes.sessionCalories.length)
          : 0,
      activeMinutes: caloriesRes.activeMinutes,
      isEstimated: true,
      sessionCalories: caloriesRes.sessionCalories,
    },
    insights,
    dataQuality: {
      hasEnoughWeighInsForProjection: bodyRes.projectedGoalDate !== null,
      hasEnoughSessionsForMistakeShift: formRes.mistakeShift !== null,
      hasExternalLoadData: strengthRes.weightedSetsCount > 0,
    },
  };
}
