// src/app/api/progress/route.ts
// FitForm Progress Dashboard Analytics API
// Aggregates:
// 1. Streak & Calendar Heatmap metrics
// 2. Badge evaluations & stable unlock timestamps
// 3. Recharts-ready analytical datasets (Form score, Weight over time, Weekly volume, Mistakes breakdown)
// 4. Headline summary statistics

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import {
  calculateStreak,
  formatToLocalDateString,
  PlanDayInfo,
} from '@/lib/progress/streakCalculator';
import { BADGE_DEFINITIONS, BadgeContext } from '@/lib/progress/badgesConfig';

const MISTAKE_COACHING_TIPS: Record<string, string> = {
  'knees caving in': 'Push your knees outward and track them directly over your middle toes as you descend.',
  'leaning too far forward': 'Keep your chest proud and engage your core to maintain an upright torso angle.',
  'not deep enough': 'Sink your hips lower until your thighs are parallel to the ground for maximum muscle recruitment.',
  'go lower': 'Lower your chest closer to the floor until your elbows form at least a 90-degree angle.',
  'hips sagging': 'Brace your abs tightly and squeeze your glutes to maintain a rigid, straight body line.',
  'hips too high': 'Lower your hips until your shoulders, hips, and ankles form a clean, continuous plank line.',
  'swinging torso': 'Keep your torso stationary and lock your elbows against your ribcage during the curl.',
  'too fast': 'Slow down your descent to a controlled 2-second tempo to build greater eccentric strength.',
  'head dropping': 'Keep your neck neutral by gazing at the floor roughly 10 cm ahead of your fingertips.',
};

function getMistakeTip(mistakeText: string): string {
  const lower = mistakeText.toLowerCase();
  for (const [key, tip] of Object.entries(MISTAKE_COACHING_TIPS)) {
    if (lower.includes(key)) {
      return tip;
    }
  }
  return 'Focus on a controlled tempo, steady rhythmic breathing, and maintaining full range of motion.';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get('userId');

    if (!userIdStr) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
    }

    // 1. Load User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        goal: true,
        experience: true,
        weightKg: true,
        isDemo: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Load 30 Program WorkoutDays
    const workoutDays = await prisma.workoutDay.findMany({
      where: { userId },
      orderBy: { dayNumber: 'asc' },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // 3. Load all WorkoutLogs
    const logs = await prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'asc' },
    });

    // 4. Load DietPlans count
    const dietPlansCount = await prisma.dietPlan.count({
      where: { userId },
    });

    // 5. Load Weight Entries
    let weightEntries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    // Auto-seed initial onboarding weight entry if none exist
    if (weightEntries.length === 0) {
      const initialDate = formatToLocalDateString(new Date(user.createdAt));
      const seeded = await prisma.weightEntry.create({
        data: {
          userId,
          weightKg: user.weightKg,
          date: initialDate,
        },
      });
      weightEntries = [seeded];
    }

    // 6. Load Persisted UserBadges
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId },
    });
    const earnedBadgeMap = new Map<string, Date>(
      existingBadges.map((b) => [b.badgeId, b.earnedAt])
    );

    // ----------------------------------------------------
    // Build Day Completion & Plan Mapping
    // ----------------------------------------------------
    const logsByDayNumber = new Map<number, typeof logs>();
    logs.forEach((log) => {
      const list = logsByDayNumber.get(log.dayNumber) || [];
      list.push(log);
      logsByDayNumber.set(log.dayNumber, list);
    });

    const planDaysInfo: PlanDayInfo[] = workoutDays.map((day) => {
      const dayLogs = logsByDayNumber.get(day.dayNumber) || [];
      const isCompleted = dayLogs.length > 0;
      let formScore: number | null = null;
      let completedAt: string | null = null;

      if (isCompleted) {
        const scores = dayLogs
          .map((l) => l.formScore)
          .filter((s): s is number => s !== null && s !== undefined);
        if (scores.length > 0) {
          formScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
        completedAt = dayLogs[dayLogs.length - 1].completedAt.toISOString();
      }

      return {
        dayNumber: day.dayNumber,
        workoutType: day.workoutType,
        isRest: day.isRest,
        isCompleted,
        formScore,
        completedAt,
      };
    });

    // ----------------------------------------------------
    // Streaks & Heatmap Calculation
    // ----------------------------------------------------
    const userCreatedDateStr = formatToLocalDateString(new Date(user.createdAt));
    const streakResult = calculateStreak(planDaysInfo, userCreatedDateStr);

    // Check Comeback Condition:
    // Did user complete a workout day that comes after a missed workout day?
    const completedDayNumbers = Array.from(logsByDayNumber.keys()).sort((a, b) => a - b);
    let hasComeback = false;
    for (let i = 0; i < completedDayNumbers.length; i++) {
      const curr = completedDayNumbers[i];
      // Check if there was any prior planned workout day that was never completed
      const hadSkippedPrior = workoutDays.some(
        (w) => !w.isRest && w.dayNumber < curr && !logsByDayNumber.has(w.dayNumber)
      );
      if (hadSkippedPrior) {
        hasComeback = true;
        break;
      }
    }

    // ----------------------------------------------------
    // Badges Evaluation & Persistence
    // ----------------------------------------------------
    const badgeContext: BadgeContext = {
      totalWorkouts: streakResult.totalWorkoutsCompleted,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      completedDayNumbers,
      logs: logs.map((l) => ({
        exercise: l.exercise,
        reps: l.reps,
        durationSeconds: l.durationSeconds,
        formScore: l.formScore,
      })),
      dietPlansCount,
      hasComeback,
    };

    const evaluatedBadges = await Promise.all(
      BADGE_DEFINITIONS.map(async (def) => {
        const progress = def.evaluate(badgeContext);
        let earnedAt: string | null = null;

        if (progress.isUnlocked) {
          if (earnedBadgeMap.has(def.id)) {
            earnedAt = earnedBadgeMap.get(def.id)!.toISOString();
          } else {
            // Newly earned! Persist into DB so earnedAt remains stable forever
            const created = await prisma.userBadge.create({
              data: {
                userId,
                badgeId: def.id,
              },
            });
            earnedAt = created.earnedAt.toISOString();
            earnedBadgeMap.set(def.id, created.earnedAt);
          }
        }

        return {
          id: def.id,
          name: def.name,
          description: def.description,
          category: def.category,
          iconKey: def.iconKey,
          gradient: def.gradient,
          isUnlocked: progress.isUnlocked,
          earnedAt,
          currentValue: progress.currentValue,
          targetValue: progress.targetValue,
          unit: progress.unit,
          displayText: progress.displayText,
        };
      })
    );

    // ----------------------------------------------------
    // Chart Datasets & Metric Summaries
    // ----------------------------------------------------
    const scoredLogs = logs.filter((l) => l.formScore !== null && l.formScore !== undefined);
    const averageFormScore =
      scoredLogs.length > 0
        ? Math.round(
            scoredLogs.reduce((sum, l) => sum + (l.formScore || 0), 0) / scoredLogs.length
          )
        : null;

    // Best set
    let bestSet: {
      exercise: string;
      formScore: number;
      reps: number;
      durationSeconds: number | null;
      dayNumber: number;
      date: string;
    } | null = null;

    if (scoredLogs.length > 0) {
      const top = [...scoredLogs].sort((a, b) => (b.formScore || 0) - (a.formScore || 0))[0];
      bestSet = {
        exercise: top.exercise,
        formScore: Math.round(top.formScore || 0),
        reps: top.reps,
        durationSeconds: top.durationSeconds,
        dayNumber: top.dayNumber,
        date: formatToLocalDateString(new Date(top.completedAt)),
      };
    }

    const totalReps = logs.reduce((sum, l) => sum + (l.reps || 0), 0);
    const totalPlankSeconds = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
    const totalRestSeconds = logs.reduce((sum, l) => sum + (l.restSeconds || 60), 0);

    // Total workout minutes estimate (time under tension + plank + rest duration)
    const estimatedActiveSeconds = totalReps * 3.5 + totalPlankSeconds + totalRestSeconds;
    const totalWorkoutMinutes = Math.max(1, Math.round(estimatedActiveSeconds / 60));

    // 1. Form Score Over Time (per completed day with scores)
    const formScoreOverTime: {
      dayNumber: number;
      label: string;
      date: string;
      avgScore: number;
      bestScore: number;
    }[] = [];

    logsByDayNumber.forEach((dayLogs, dayNum) => {
      const dayScores = dayLogs
        .map((l) => l.formScore)
        .filter((s): s is number => s !== null && s !== undefined);
      if (dayScores.length > 0) {
        const avg = Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length);
        const best = Math.round(Math.max(...dayScores));
        const date = formatToLocalDateString(new Date(dayLogs[0].completedAt));
        formScoreOverTime.push({
          dayNumber: dayNum,
          label: `Day ${dayNum}`,
          date,
          avgScore: avg,
          bestScore: best,
        });
      }
    });
    formScoreOverTime.sort((a, b) => a.dayNumber - b.dayNumber);

    // 2. Weight Over Time
    const startWeight = weightEntries[0]?.weightKg ?? user.weightKg;
    const currentWeight = weightEntries[weightEntries.length - 1]?.weightKg ?? user.weightKg;
    const weightDelta = Number((currentWeight - startWeight).toFixed(1));

    const weightHistory = weightEntries.map((w) => ({
      date: w.date,
      weightKg: w.weightKg,
    }));

    // 3. Weekly Volume (Weeks 1 to 5)
    const weeklyVolume: {
      week: string;
      weekNumber: number;
      totalReps: number;
      totalPlankSeconds: number;
      workoutsCompleted: number;
      workoutsPlanned: number;
    }[] = [];

    for (let w = 1; w <= 5; w++) {
      const startDay = (w - 1) * 6 + 1; // 6 days per week in 30-day program
      const endDay = Math.min(30, w * 6);
      const weekPlanDays = workoutDays.filter(
        (d) => d.dayNumber >= startDay && d.dayNumber <= endDay
      );
      const workoutsPlanned = weekPlanDays.filter((d) => !d.isRest).length;

      let weekReps = 0;
      let weekPlankSecs = 0;
      let workoutsCompleted = 0;

      for (let d = startDay; d <= endDay; d++) {
        const dayLogs = logsByDayNumber.get(d) || [];
        if (dayLogs.length > 0) {
          const isRest = weekPlanDays.find((p) => p.dayNumber === d)?.isRest;
          if (!isRest) workoutsCompleted += 1;
          weekReps += dayLogs.reduce((sum, l) => sum + (l.reps || 0), 0);
          weekPlankSecs += dayLogs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
        }
      }

      weeklyVolume.push({
        week: `Week ${w}`,
        weekNumber: w,
        totalReps: weekReps,
        totalPlankSeconds: weekPlankSecs,
        workoutsCompleted,
        workoutsPlanned,
      });
    }

    // 4. Mistakes Breakdown
    const mistakeCounts = new Map<string, number>();
    logs.forEach((log) => {
      if (!log.mistakes) return;
      try {
        let parsed: string[] = [];
        if (log.mistakes.startsWith('[')) {
          parsed = JSON.parse(log.mistakes);
        } else {
          parsed = log.mistakes.split(',').map((s) => s.trim()).filter(Boolean);
        }
        parsed.forEach((m) => {
          const cleaned = m.trim();
          if (cleaned) {
            mistakeCounts.set(cleaned, (mistakeCounts.get(cleaned) || 0) + 1);
          }
        });
      } catch {
        // Fallback comma-split
        const parts = log.mistakes.split(',').map((s) => s.trim()).filter(Boolean);
        parts.forEach((p) => mistakeCounts.set(p, (mistakeCounts.get(p) || 0) + 1));
      }
    });

    const mistakesBreakdown = Array.from(mistakeCounts.entries())
      .map(([mistake, count]) => ({
        mistake,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const topMistake = mistakesBreakdown[0]?.mistake || null;
    const topMistakeTip = topMistake ? getMistakeTip(topMistake) : null;

    // 5. Per-Exercise Form Trends
    const supportedExercises = ['Squat', 'Push-Up', 'Bicep Curl', 'Lunge', 'Plank'];
    const exerciseFormTrends: Record<string, { dayNumber: number; date: string; score: number }[]> = {};

    supportedExercises.forEach((exName) => {
      const exLogs = logs.filter(
        (l) =>
          l.exercise.toLowerCase().replace(/[-_]/g, ' ').includes(exName.toLowerCase().replace(/[-_]/g, ' ')) &&
          l.formScore !== null &&
          l.formScore !== undefined
      );

      exerciseFormTrends[exName] = exLogs.map((l) => ({
        dayNumber: l.dayNumber,
        date: formatToLocalDateString(new Date(l.completedAt)),
        score: Math.round(l.formScore || 0),
      }));
    });

    return NextResponse.json({
      user,
      isEmpty: logs.length === 0,
      summary: {
        averageFormScore,
        bestSet,
        totalReps,
        totalPlankSeconds,
        totalWorkoutMinutes,
        totalWorkoutsCompleted: streakResult.totalWorkoutsCompleted,
        totalSets: logs.length,
      },
      streak: streakResult,
      badges: evaluatedBadges,
      charts: {
        formScoreOverTime,
        weightHistory: {
          startWeight,
          currentWeight,
          weightDelta,
          entries: weightHistory,
        },
        weeklyVolume,
        mistakesBreakdown,
        topMistakeTip,
        exerciseFormTrends,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching progress dashboard data:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
