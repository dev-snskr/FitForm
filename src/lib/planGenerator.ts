// FitForm 30-Day Deterministic Plan Generator
// Strictly follows template rules based on goal, experience, and daysPerWeek.
// No AI or random calls - pure deterministic algorithmic logic.

import { EXERCISE_REGISTRY } from './exerciseData';

export interface PlanExercise {
  exerciseName: string;
  targetMuscles: string;
  sets: number;
  reps: number;
  durationSecs: number | null;
  restSeconds: number;
  formTrackable: boolean;
  orderIndex: number;
  badgeLabel?: string;
}

export interface GeneratedDay {
  dayNumber: number;
  workoutType: string;
  isRest: boolean;
  notes?: string;
  exercises: PlanExercise[];
}

export function generate30DayPlan(
  goal: string,
  experience: string,
  daysPerWeek: number
): GeneratedDay[] {
  const plan: GeneratedDay[] = [];

  // Weekly rest pattern based on daysPerWeek (1-based index within 7-day cycle)
  // Day 7 is always active recovery or rest
  const isWorkoutDayInCycle = (dayInWeek: number, daysWeek: number): boolean => {
    if (dayInWeek === 7) return false; // 7th day is active recovery / rest
    switch (daysWeek) {
      case 3: // 3 workout days: Mon(1), Wed(3), Fri(5)
        return dayInWeek === 1 || dayInWeek === 3 || dayInWeek === 5;
      case 4: // 4 workout days: Mon(1), Tue(2), Thu(4), Fri(5)
        return dayInWeek === 1 || dayInWeek === 2 || dayInWeek === 4 || dayInWeek === 5;
      case 5: // 5 workout days: Mon(1), Tue(2), Wed(3), Fri(5), Sat(6)
        return dayInWeek === 1 || dayInWeek === 2 || dayInWeek === 3 || dayInWeek === 5 || dayInWeek === 6;
      case 6: // 6 workout days: 1, 2, 3, 4, 5, 6
      default:
        return dayInWeek >= 1 && dayInWeek <= 6;
    }
  };

  // Base parameters per goal
  const normalizedGoal = goal.toLowerCase();
  const normalizedExp = experience.toLowerCase();

  // Experience multipliers
  let setBonus = 0;
  let repBonus = 0;
  let restModifier = 0;

  if (normalizedExp === 'beginner') {
    setBonus = 0;
    repBonus = 0;
    restModifier = 10; // slightly more rest for beginners
  } else if (normalizedExp === 'intermediate') {
    setBonus = 1;
    repBonus = 2;
    restModifier = 0;
  } else if (normalizedExp === 'advanced') {
    setBonus = 1;
    repBonus = 4;
    restModifier = -10;
  }

  // Generate all 30 days
  for (let day = 1; day <= 30; day++) {
    const dayInWeek = ((day - 1) % 7) + 1; // 1 to 7
    const weekNumber = Math.floor((day - 1) / 7) + 1; // 1 to 5 (week 5 has days 29, 30)

    // Check if it's the 7th day of the cycle (Active recovery / lighter day)
    if (dayInWeek === 7) {
      plan.push({
        dayNumber: day,
        workoutType: 'Active Recovery & Core Mobility',
        isRest: true,
        notes: 'Lighter day: Focus on light stretching, dynamic walking, and muscle recovery.',
        exercises: [],
      });
      continue;
    }

    // Check if designated rest day in weekly schedule
    if (!isWorkoutDayInCycle(dayInWeek, daysPerWeek)) {
      plan.push({
        dayNumber: day,
        workoutType: 'Rest & Muscle Repair',
        isRest: true,
        notes: 'Rest day: Hydrate, get at least 8 hours of sleep, and let your body adapt.',
        exercises: [],
      });
      continue;
    }

    // Weekly progressive overload adjustments
    // Difficulty rises each week (more sets/reps or shorter rest)
    const weekSetAdd = weekNumber >= 3 ? 1 : 0;
    const weekRepAdd = (weekNumber - 1) * 2;
    const weekRestCut = Math.min((weekNumber - 1) * 5, 15);

    const exercises: PlanExercise[] = [];
    let workoutType = '';

    if (normalizedGoal === 'fat_loss') {
      // Circuit style: higher reps, default rest 30 sec
      workoutType = `Fat-Burn Circuit (${dayInWeek % 2 === 1 ? 'Lower & Core' : 'Upper & Cardio'})`;
      const baseRest = Math.max(20, 30 + restModifier - weekRestCut);

      if (dayInWeek % 2 === 1) {
        // Lower & Core circuit
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.squat.name,
          targetMuscles: EXERCISE_REGISTRY.squat.targetMuscles,
          sets: 3 + setBonus + weekSetAdd,
          reps: 15 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 1,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.jumping_jacks.name,
          targetMuscles: EXERCISE_REGISTRY.jumping_jacks.targetMuscles,
          sets: 3 + setBonus + weekSetAdd,
          reps: 25 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: false,
          badgeLabel: 'Form check coming later',
          orderIndex: 2,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.lunge.name,
          targetMuscles: EXERCISE_REGISTRY.lunge.targetMuscles,
          sets: 3 + setBonus,
          reps: 12 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 3,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.plank.name,
          targetMuscles: EXERCISE_REGISTRY.plank.targetMuscles,
          sets: 3 + setBonus,
          reps: 0,
          durationSecs: 30 + (weekNumber - 1) * 10 + repBonus * 3,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 4,
        });
      } else {
        // Upper & Cardio circuit
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.push_up.name,
          targetMuscles: EXERCISE_REGISTRY.push_up.targetMuscles,
          sets: 3 + setBonus + weekSetAdd,
          reps: 12 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 1,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.mountain_climbers.name,
          targetMuscles: EXERCISE_REGISTRY.mountain_climbers.targetMuscles,
          sets: 3 + setBonus,
          reps: 20 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: false,
          badgeLabel: 'Form check coming later',
          orderIndex: 2,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.bicep_curl.name,
          targetMuscles: EXERCISE_REGISTRY.bicep_curl.targetMuscles,
          sets: 3 + setBonus,
          reps: 14 + repBonus + weekRepAdd,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 3,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.plank.name,
          targetMuscles: EXERCISE_REGISTRY.plank.targetMuscles,
          sets: 3 + setBonus,
          reps: 0,
          durationSecs: 35 + (weekNumber - 1) * 10,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 4,
        });
      }
    } else if (normalizedGoal === 'muscle_gain') {
      // Strength style: lower reps, more sets, default rest 150 sec
      workoutType = `Strength & Hypertrophy (${dayInWeek % 2 === 1 ? 'Push & Squat Focus' : 'Pull & Leg Hypertrophy'})`;
      const baseRest = Math.max(90, 150 + restModifier - weekRestCut);

      if (dayInWeek % 2 === 1) {
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.squat.name,
          targetMuscles: EXERCISE_REGISTRY.squat.targetMuscles,
          sets: 4 + setBonus + weekSetAdd,
          reps: 8 + repBonus + Math.floor(weekRepAdd / 2),
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 1,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.push_up.name,
          targetMuscles: EXERCISE_REGISTRY.push_up.targetMuscles,
          sets: 4 + setBonus + weekSetAdd,
          reps: 8 + repBonus + Math.floor(weekRepAdd / 2),
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 2,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.glute_bridge.name,
          targetMuscles: EXERCISE_REGISTRY.glute_bridge.targetMuscles,
          sets: 3 + setBonus,
          reps: 10 + repBonus,
          durationSecs: null,
          restSeconds: Math.max(60, baseRest - 30),
          formTrackable: false,
          badgeLabel: 'Form check coming later',
          orderIndex: 3,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.plank.name,
          targetMuscles: EXERCISE_REGISTRY.plank.targetMuscles,
          sets: 3 + setBonus,
          reps: 0,
          durationSecs: 45 + (weekNumber - 1) * 15,
          restSeconds: 90,
          formTrackable: true,
          orderIndex: 4,
        });
      } else {
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.lunge.name,
          targetMuscles: EXERCISE_REGISTRY.lunge.targetMuscles,
          sets: 4 + setBonus + weekSetAdd,
          reps: 10 + repBonus + Math.floor(weekRepAdd / 2),
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 1,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.bicep_curl.name,
          targetMuscles: EXERCISE_REGISTRY.bicep_curl.targetMuscles,
          sets: 4 + setBonus + weekSetAdd,
          reps: 10 + repBonus + Math.floor(weekRepAdd / 2),
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 2,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.push_up.name,
          targetMuscles: EXERCISE_REGISTRY.push_up.targetMuscles,
          sets: 3 + setBonus,
          reps: 10 + repBonus,
          durationSecs: null,
          restSeconds: baseRest,
          formTrackable: true,
          orderIndex: 3,
        });
        exercises.push({
          exerciseName: EXERCISE_REGISTRY.plank.name,
          targetMuscles: EXERCISE_REGISTRY.plank.targetMuscles,
          sets: 3 + setBonus,
          reps: 0,
          durationSecs: 45 + (weekNumber - 1) * 15,
          restSeconds: 90,
          formTrackable: true,
          orderIndex: 4,
        });
      }
    } else {
      // Maintain: balanced, default rest 60 sec
      workoutType = `Total Body Conditioning (Day ${day})`;
      const baseRest = Math.max(45, 60 + restModifier - weekRestCut);

      exercises.push({
        exerciseName: EXERCISE_REGISTRY.squat.name,
        targetMuscles: EXERCISE_REGISTRY.squat.targetMuscles,
        sets: 3 + setBonus + weekSetAdd,
        reps: 12 + repBonus + Math.floor(weekRepAdd / 2),
        durationSecs: null,
        restSeconds: baseRest,
        formTrackable: true,
        orderIndex: 1,
      });
      exercises.push({
        exerciseName: EXERCISE_REGISTRY.push_up.name,
        targetMuscles: EXERCISE_REGISTRY.push_up.targetMuscles,
        sets: 3 + setBonus + weekSetAdd,
        reps: 10 + repBonus + Math.floor(weekRepAdd / 2),
        durationSecs: null,
        restSeconds: baseRest,
        formTrackable: true,
        orderIndex: 2,
      });
      exercises.push({
        exerciseName: EXERCISE_REGISTRY.bicep_curl.name,
        targetMuscles: EXERCISE_REGISTRY.bicep_curl.targetMuscles,
        sets: 3 + setBonus,
        reps: 12 + repBonus,
        durationSecs: null,
        restSeconds: baseRest,
        formTrackable: true,
        orderIndex: 3,
      });
      exercises.push({
        exerciseName: EXERCISE_REGISTRY.lunge.name,
        targetMuscles: EXERCISE_REGISTRY.lunge.targetMuscles,
        sets: 3 + setBonus,
        reps: 10 + repBonus,
        durationSecs: null,
        restSeconds: baseRest,
        formTrackable: true,
        orderIndex: 4,
      });
      exercises.push({
        exerciseName: EXERCISE_REGISTRY.plank.name,
        targetMuscles: EXERCISE_REGISTRY.plank.targetMuscles,
        sets: 3 + setBonus,
        reps: 0,
        durationSecs: 40 + (weekNumber - 1) * 10,
        restSeconds: baseRest,
        formTrackable: true,
        orderIndex: 5,
      });
    }

    plan.push({
      dayNumber: day,
      workoutType,
      isRest: false,
      exercises,
    });
  }

  return plan;
}
