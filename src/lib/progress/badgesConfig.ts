// src/lib/progress/badgesConfig.ts
// FitForm Centralized Badge Registry
// Single Source of Truth for all 14 milestone badges.
// Every badge provides:
// - id, name, description, category, and visual accent
// - deterministic evaluation rule calculating current progress vs target

export interface BadgeContext {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  completedDayNumbers: number[];
  logs: {
    exercise: string;
    reps: number;
    durationSeconds: number | null;
    formScore: number | null;
  }[];
  dietPlansCount: number;
  hasComeback: boolean;
}

export interface BadgeProgress {
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  displayText: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'streak' | 'milestone' | 'form' | 'strength' | 'nutrition';
  iconKey: string;
  gradient: string;
  evaluate: (ctx: BadgeContext) => BadgeProgress;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // 1. First Workout
  {
    id: 'first_workout',
    name: 'First Step',
    description: 'Complete your first workout session.',
    category: 'milestone',
    iconKey: 'Dumbbell',
    gradient: 'from-amber-400 to-orange-500',
    evaluate: (ctx) => {
      const val = Math.min(1, ctx.totalWorkouts);
      return {
        isUnlocked: val >= 1,
        currentValue: val,
        targetValue: 1,
        unit: 'workout',
        displayText: `${val} of 1 workout`,
      };
    },
  },

  // 2. 3-Day Streak
  {
    id: 'streak_3',
    name: '3-Day Momentum',
    description: 'Maintain a 3-day workout streak.',
    category: 'streak',
    iconKey: 'Flame',
    gradient: 'from-orange-500 to-red-500',
    evaluate: (ctx) => {
      const streak = Math.max(ctx.currentStreak, ctx.longestStreak);
      return {
        isUnlocked: streak >= 3,
        currentValue: Math.min(3, streak),
        targetValue: 3,
        unit: 'days',
        displayText: `${Math.min(3, streak)} of 3 days`,
      };
    },
  },

  // 3. 7-Day Streak
  {
    id: 'streak_7',
    name: '7-Day Champion',
    description: 'Build an unbroken 7-day fitness streak.',
    category: 'streak',
    iconKey: 'Zap',
    gradient: 'from-yellow-400 to-amber-600',
    evaluate: (ctx) => {
      const streak = Math.max(ctx.currentStreak, ctx.longestStreak);
      return {
        isUnlocked: streak >= 7,
        currentValue: Math.min(7, streak),
        targetValue: 7,
        unit: 'days',
        displayText: `${Math.min(7, streak)} of 7 days`,
      };
    },
  },

  // 4. 14-Day Streak
  {
    id: 'streak_14',
    name: '2-Week Iron Habit',
    description: 'Push through a 14-day streak of dedication.',
    category: 'streak',
    iconKey: 'ShieldAlert',
    gradient: 'from-violet-500 to-purple-700',
    evaluate: (ctx) => {
      const streak = Math.max(ctx.currentStreak, ctx.longestStreak);
      return {
        isUnlocked: streak >= 14,
        currentValue: Math.min(14, streak),
        targetValue: 14,
        unit: 'days',
        displayText: `${Math.min(14, streak)} of 14 days`,
      };
    },
  },

  // 5. Full Week (Week 1 all planned workouts)
  {
    id: 'full_week',
    name: 'Full Week Clean Sweep',
    description: 'Complete all planned workouts in a single program week.',
    category: 'milestone',
    iconKey: 'CalendarCheck',
    gradient: 'from-blue-500 to-indigo-600',
    evaluate: (ctx) => {
      // Check if any block of 7 program days or week 1 has all planned days completed
      const week1Days = ctx.completedDayNumbers.filter((d) => d <= 7).length;
      return {
        isUnlocked: week1Days >= 5, // Typical 5-day workout week
        currentValue: Math.min(5, week1Days),
        targetValue: 5,
        unit: 'workouts',
        displayText: `${Math.min(5, week1Days)} of 5 workouts in week`,
      };
    },
  },

  // 6. Halfway There (Day 15 completed)
  {
    id: 'halfway',
    name: 'Halfway Hero',
    description: 'Cross the program midpoint by completing Day 15.',
    category: 'milestone',
    iconKey: 'Flag',
    gradient: 'from-cyan-400 to-blue-600',
    evaluate: (ctx) => {
      const isDone = ctx.completedDayNumbers.includes(15);
      const count = ctx.completedDayNumbers.filter((d) => d <= 15).length;
      return {
        isUnlocked: isDone,
        currentValue: isDone ? 15 : Math.min(14, count),
        targetValue: 15,
        unit: 'days',
        displayText: isDone ? 'Day 15 completed' : `${count} of 15 days`,
      };
    },
  },

  // 7. Program Complete (All 30 days)
  {
    id: 'program_complete',
    name: '30-Day Legend',
    description: 'Complete all 30 days of the FitForm transformation program.',
    category: 'milestone',
    iconKey: 'Trophy',
    gradient: 'from-amber-300 via-yellow-400 to-amber-600',
    evaluate: (ctx) => {
      const distinctCompleted = new Set(ctx.completedDayNumbers).size;
      return {
        isUnlocked: distinctCompleted >= 30,
        currentValue: Math.min(30, distinctCompleted),
        targetValue: 30,
        unit: 'days',
        displayText: `${Math.min(30, distinctCompleted)} of 30 days`,
      };
    },
  },

  // 8. First Perfect Form (score >= 90)
  {
    id: 'first_perfect_form',
    name: 'Biomechanical Precision',
    description: 'Score 90% or higher form accuracy on any exercise set.',
    category: 'form',
    iconKey: 'Sparkles',
    gradient: 'from-emerald-400 to-teal-600',
    evaluate: (ctx) => {
      const hasPerfect = ctx.logs.some((l) => (l.formScore || 0) >= 90);
      return {
        isUnlocked: hasPerfect,
        currentValue: hasPerfect ? 1 : 0,
        targetValue: 1,
        unit: 'set',
        displayText: hasPerfect ? '90%+ set achieved' : '0 of 1 set (score ≥90%)',
      };
    },
  },

  // 9. 5 Perfect Sets
  {
    id: 'perfect_5',
    name: 'Master of Form',
    description: 'Complete 5 sets with 90%+ camera biomechanical accuracy.',
    category: 'form',
    iconKey: 'Award',
    gradient: 'from-teal-400 to-emerald-700',
    evaluate: (ctx) => {
      const count = ctx.logs.filter((l) => (l.formScore || 0) >= 90).length;
      return {
        isUnlocked: count >= 5,
        currentValue: Math.min(5, count),
        targetValue: 5,
        unit: 'sets',
        displayText: `${Math.min(5, count)} of 5 perfect sets`,
      };
    },
  },

  // 10. Squat Master (100 squat reps)
  {
    id: 'squat_master',
    name: 'Squat Master',
    description: 'Accumulate 100 total repetitions of squats.',
    category: 'strength',
    iconKey: 'Layers',
    gradient: 'from-indigo-400 to-purple-600',
    evaluate: (ctx) => {
      const total = ctx.logs
        .filter((l) => l.exercise.toLowerCase().includes('squat'))
        .reduce((sum, l) => sum + (l.reps || 0), 0);
      return {
        isUnlocked: total >= 100,
        currentValue: Math.min(100, total),
        targetValue: 100,
        unit: 'reps',
        displayText: `${Math.min(100, total)} of 100 squat reps`,
      };
    },
  },

  // 11. Push-up Pro (100 push-up reps)
  {
    id: 'pushup_pro',
    name: 'Push-up Pro',
    description: 'Accumulate 100 total repetitions of push-ups.',
    category: 'strength',
    iconKey: 'Shield',
    gradient: 'from-pink-500 to-rose-600',
    evaluate: (ctx) => {
      const total = ctx.logs
        .filter((l) => l.exercise.toLowerCase().includes('push-up') || l.exercise.toLowerCase().includes('push up'))
        .reduce((sum, l) => sum + (l.reps || 0), 0);
      return {
        isUnlocked: total >= 100,
        currentValue: Math.min(100, total),
        targetValue: 100,
        unit: 'reps',
        displayText: `${Math.min(100, total)} of 100 push-up reps`,
      };
    },
  },

  // 12. Iron Plank (300 seconds total hold time)
  {
    id: 'iron_plank',
    name: 'Iron Plank',
    description: 'Accumulate 5 total minutes (300 seconds) in forearm plank.',
    category: 'strength',
    iconKey: 'Timer',
    gradient: 'from-cyan-500 to-teal-700',
    evaluate: (ctx) => {
      const totalSecs = ctx.logs
        .filter((l) => l.exercise.toLowerCase().includes('plank'))
        .reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
      return {
        isUnlocked: totalSecs >= 300,
        currentValue: Math.min(300, totalSecs),
        targetValue: 300,
        unit: 'seconds',
        displayText: `${Math.min(300, totalSecs)} of 300 plank seconds`,
      };
    },
  },

  // 13. Diet Planner
  {
    id: 'diet_planner',
    name: 'Dietary Strategist',
    description: 'Save your first personalized macro and budget diet plan.',
    category: 'nutrition',
    iconKey: 'Utensils',
    gradient: 'from-emerald-500 to-green-700',
    evaluate: (ctx) => {
      const count = ctx.dietPlansCount;
      return {
        isUnlocked: count >= 1,
        currentValue: Math.min(1, count),
        targetValue: 1,
        unit: 'plan',
        displayText: count >= 1 ? 'Diet plan saved' : '0 of 1 diet plan',
      };
    },
  },

  // 14. Comeback
  {
    id: 'comeback',
    name: 'The Comeback',
    description: 'Return and finish a workout after missing a planned day.',
    category: 'milestone',
    iconKey: 'RotateCcw',
    gradient: 'from-fuchsia-500 to-purple-600',
    evaluate: (ctx) => {
      return {
        isUnlocked: ctx.hasComeback,
        currentValue: ctx.hasComeback ? 1 : 0,
        targetValue: 1,
        unit: 'milestone',
        displayText: ctx.hasComeback ? 'Comeback complete!' : '0 of 1 comeback',
      };
    },
  },
];

/**
 * Finds a badge definition by ID.
 */
export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
