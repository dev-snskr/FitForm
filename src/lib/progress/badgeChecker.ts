// src/lib/progress/badgeChecker.ts
// FitForm Shared Badge Evaluation & Persistence Utility
// Evaluates badge conditions against user logs, streaks, and diet plans.
// Persists newly unlocked badges to UserBadge table with stable timestamps.

import { prisma } from '@/lib/prisma';
import { BADGE_DEFINITIONS, BadgeContext, BadgeDefinition } from './badgesConfig';
import { calculateStreak, formatToLocalDateString, PlanDayInfo } from './streakCalculator';

export interface UnlockedBadgeSummary {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  gradient: string;
}

export async function evaluateAndSyncUserBadges(userId: number): Promise<{
  allBadges: Array<BadgeDefinition & { isUnlocked: boolean; earnedAt: string | null; displayText: string }>;
  newlyEarnedBadges: UnlockedBadgeSummary[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true },
  });

  if (!user) {
    return { allBadges: [], newlyEarnedBadges: [] };
  }

  // Load all logs
  const logs = await prisma.workoutLog.findMany({
    where: { userId },
    orderBy: { completedAt: 'asc' },
  });

  // Load workout days
  const workoutDays = await prisma.workoutDay.findMany({
    where: { userId },
    orderBy: { dayNumber: 'asc' },
  });

  // Load diet plans count
  const dietPlansCount = await prisma.dietPlan.count({
    where: { userId },
  });

  // Load existing badges
  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
  });
  const existingBadgeMap = new Map<string, Date>(
    existingBadges.map((b) => [b.badgeId, b.earnedAt])
  );

  // Map days
  const logsByDayNumber = new Map<number, typeof logs>();
  logs.forEach((log) => {
    const list = logsByDayNumber.get(log.dayNumber) || [];
    list.push(log);
    logsByDayNumber.set(log.dayNumber, list);
  });

  const planDaysInfo: PlanDayInfo[] = workoutDays.map((day) => {
    const dayLogs = logsByDayNumber.get(day.dayNumber) || [];
    return {
      dayNumber: day.dayNumber,
      workoutType: day.workoutType,
      isRest: day.isRest,
      isCompleted: dayLogs.length > 0,
    };
  });

  const userCreatedDateStr = formatToLocalDateString(new Date(user.createdAt));
  const streakResult = calculateStreak(planDaysInfo, userCreatedDateStr);

  const completedDayNumbers = Array.from(logsByDayNumber.keys()).sort((a, b) => a - b);
  let hasComeback = false;
  for (let i = 0; i < completedDayNumbers.length; i++) {
    const curr = completedDayNumbers[i];
    const hadSkippedPrior = workoutDays.some(
      (w) => !w.isRest && w.dayNumber < curr && !logsByDayNumber.has(w.dayNumber)
    );
    if (hadSkippedPrior) {
      hasComeback = true;
      break;
    }
  }

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

  const newlyEarnedBadges: UnlockedBadgeSummary[] = [];

  const allBadges = await Promise.all(
    BADGE_DEFINITIONS.map(async (def) => {
      const progress = def.evaluate(badgeContext);
      let earnedAt: string | null = null;

      if (progress.isUnlocked) {
        if (existingBadgeMap.has(def.id)) {
          earnedAt = existingBadgeMap.get(def.id)!.toISOString();
        } else {
          // Brand new unlock!
          const created = await prisma.userBadge.create({
            data: {
              userId,
              badgeId: def.id,
            },
          });
          earnedAt = created.earnedAt.toISOString();
          existingBadgeMap.set(def.id, created.earnedAt);

          newlyEarnedBadges.push({
            id: def.id,
            name: def.name,
            description: def.description,
            iconKey: def.iconKey,
            gradient: def.gradient,
          });
        }
      }

      return {
        ...def,
        isUnlocked: progress.isUnlocked,
        earnedAt,
        displayText: progress.displayText,
      };
    })
  );

  return { allBadges, newlyEarnedBadges };
}
