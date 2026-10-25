// src/app/api/dev/demo-data/route.ts
// FitForm Demo Data Management Tool (Development Only)
// Creates an isolated "Demo User" profile with ~3 weeks of realistic history:
// - Gradual form score improvement (74% -> 94%)
// - Planned rest days and an intentionally missed day (to demonstrate streak break & Comeback badge)
// - Gradually decreasing weight progression (-2.1 kg over 3 weeks)
// - Realistic volume across Squat, Push-up, Bicep Curl, Lunge, and Forearm Plank
// - Clean deletion endpoint ensuring demo data is NEVER mixed into real profiles

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generate30DayPlan } from '@/lib/planGenerator';
import { formatToLocalDateString } from '@/lib/progress/streakCalculator';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEMO_USER_NAME = 'Demo User (Sample)';

async function syncWorkoutLogsJson() {
  try {
    const allLogs = await prisma.workoutLog.findMany({
      orderBy: { completedAt: 'desc' },
    });
    const jsonPath = path.resolve(process.cwd(), 'data', 'workout_logs.json');
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(allLogs, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to sync workout_logs.json after demo data change:', err);
  }
}

// GET: check if demo user currently exists
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  const demoUser = await prisma.user.findFirst({
    where: {
      OR: [{ name: DEMO_USER_NAME }, { isDemo: true }],
    },
    select: { id: true, name: true, createdAt: true, isDemo: true },
  });

  return NextResponse.json({
    exists: Boolean(demoUser),
    demoUser,
  });
}

// POST: generate demo profile and realistic 3-week history
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  try {
    // 1. Clean up any existing demo user first
    const existing = await prisma.user.findMany({
      where: {
        OR: [{ name: DEMO_USER_NAME }, { isDemo: true }],
      },
      select: { id: true },
    });

    for (const u of existing) {
      await prisma.user.delete({ where: { id: u.id } });
    }

    // 2. Create Demo User
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 21); // 21 days ago (~3 weeks)

    const demoUser = await prisma.user.create({
      data: {
        name: DEMO_USER_NAME,
        age: 27,
        gender: 'male',
        heightCm: 176,
        weightKg: 76.4,
        goal: 'fat_loss',
        experience: 'intermediate',
        daysPerWeek: 5,
        isDemo: true,
        createdAt: startDate,
      },
    });

    // 3. Generate 30-Day Plan for Demo User
    const planDays = generate30DayPlan('fat_loss', 'intermediate', 5);
    for (const day of planDays) {
      const createdDay = await prisma.workoutDay.create({
        data: {
          userId: demoUser.id,
          dayNumber: day.dayNumber,
          workoutType: day.workoutType,
          isRest: day.isRest,
        },
      });

      if (day.exercises.length > 0) {
        await prisma.dayExercise.createMany({
          data: day.exercises.map((ex) => ({
            workoutDayId: createdDay.id,
            exerciseName: ex.exerciseName,
            targetMuscles: ex.targetMuscles,
            sets: ex.sets,
            reps: ex.reps,
            durationSecs: ex.durationSecs,
            restSeconds: ex.restSeconds,
            formTrackable: ex.formTrackable,
            orderIndex: ex.orderIndex,
          })),
        });
      }
    }

    // 4. Populate Realistic Logs for Days 1 through 18 (~3 weeks)
    // Days breakdown:
    // Week 1 (Days 1 to 6): Days 1, 2, 3 done, Day 4 Rest, Days 5, 6 done.
    // Week 2 (Days 7 to 12): Day 7 Rest, Day 8 MISSED!, Days 9, 10, 11 COMEBACK done, Day 12 Rest.
    // Week 3 (Days 13 to 18): Days 13, 14, 15 (Halfway!) done, Day 16 Rest, Days 17, 18 done with high scores.
    const completedDaysConfig: {
      dayNumber: number;
      offsetDaysAgo: number;
      scores: number[];
      repsMap: Record<string, number[]>;
      mistakes: string[];
    }[] = [
      // Week 1 - Foundation (Scores ~75-82%)
      {
        dayNumber: 1,
        offsetDaysAgo: 20,
        scores: [76, 78, 80],
        repsMap: { Squat: [12, 12, 12], 'Push-Up': [10, 10, 8] },
        mistakes: ['Knees caving in', 'Not deep enough'],
      },
      {
        dayNumber: 2,
        offsetDaysAgo: 19,
        scores: [78, 82, 80],
        repsMap: { 'Bicep Curl': [12, 12, 10], 'Forearm Plank': [45, 45] },
        mistakes: ['Swinging torso'],
      },
      {
        dayNumber: 3,
        offsetDaysAgo: 18,
        scores: [80, 82, 82],
        repsMap: { Lunge: [10, 10, 10], Squat: [12, 12, 12] },
        mistakes: ['Leaning too far forward'],
      },
      // Day 4 was rest (17 days ago)
      {
        dayNumber: 5,
        offsetDaysAgo: 16,
        scores: [82, 84, 85],
        repsMap: { 'Push-Up': [12, 12, 10], 'Forearm Plank': [50, 50] },
        mistakes: ['Hips sagging'],
      },
      {
        dayNumber: 6,
        offsetDaysAgo: 15,
        scores: [84, 85, 86],
        repsMap: { Squat: [15, 15, 12], 'Bicep Curl': [12, 12, 12] },
        mistakes: ['Too fast'],
      },
      // Day 7 was rest (14 days ago)
      // Day 8 was MISSED (13 days ago)
      // Week 2 - Comeback & Progress (Scores ~84-89%)
      {
        dayNumber: 9,
        offsetDaysAgo: 12,
        scores: [85, 87, 88],
        repsMap: { 'Push-Up': [12, 12, 12], Squat: [15, 15, 15] },
        mistakes: ['Knees caving in'],
      },
      {
        dayNumber: 10,
        offsetDaysAgo: 11,
        scores: [86, 88, 88],
        repsMap: { Lunge: [12, 12, 12], 'Forearm Plank': [60, 60] },
        mistakes: ['Leaning too far forward'],
      },
      {
        dayNumber: 11,
        offsetDaysAgo: 10,
        scores: [87, 89, 90],
        repsMap: { 'Bicep Curl': [14, 12, 12], Squat: [15, 15, 15] },
        mistakes: [],
      },
      // Day 12 was rest (9 days ago)
      // Week 3 - Mastery & Perfect Sets (Scores ~89-95%)
      {
        dayNumber: 13,
        offsetDaysAgo: 8,
        scores: [89, 91, 92],
        repsMap: { 'Push-Up': [15, 14, 12], Lunge: [12, 12, 12] },
        mistakes: [],
      },
      {
        dayNumber: 14,
        offsetDaysAgo: 7,
        scores: [91, 92, 93],
        repsMap: { Squat: [16, 16, 15], 'Forearm Plank': [65, 65] },
        mistakes: [],
      },
      {
        dayNumber: 15, // Midpoint! Unlocks Halfway There badge
        offsetDaysAgo: 5,
        scores: [92, 94, 95],
        repsMap: { 'Bicep Curl': [14, 14, 12], 'Push-Up': [15, 15, 14] },
        mistakes: [],
      },
      // Day 16 was rest (4 days ago)
      {
        dayNumber: 17,
        offsetDaysAgo: 3,
        scores: [93, 94, 94],
        repsMap: { Squat: [18, 16, 16], 'Forearm Plank': [70, 70] },
        mistakes: [],
      },
      {
        dayNumber: 18,
        offsetDaysAgo: 1, // Yesterday
        scores: [94, 95, 96],
        repsMap: { 'Push-Up': [16, 16, 15], Lunge: [14, 14, 12] },
        mistakes: [],
      },
    ];

    for (const c of completedDaysConfig) {
      const logDate = new Date(now);
      logDate.setDate(now.getDate() - c.offsetDaysAgo);

      let setCounter = 1;
      for (const [exerciseName, amounts] of Object.entries(c.repsMap)) {
        for (let i = 0; i < amounts.length; i++) {
          const isPlank = exerciseName.toLowerCase().includes('plank');
          const reps = isPlank ? 0 : amounts[i];
          const durationSeconds = isPlank ? amounts[i] : null;
          const score = c.scores[i % c.scores.length];
          const setMistakes = i === 0 && c.mistakes.length > 0 ? c.mistakes : [];

          await prisma.workoutLog.create({
            data: {
              userId: demoUser.id,
              userName: demoUser.name,
              dayNumber: c.dayNumber,
              exercise: exerciseName,
              setNumber: setCounter++,
              reps,
              durationSeconds,
              formScore: score,
              mistakes: JSON.stringify(setMistakes),
              restSeconds: 60,
              mode: 'live_camera',
              completedAt: logDate,
            },
          });
        }
      }
    }

    // 5. Weight Progression Entries (-2.1 kg over 3 weeks)
    const weightSchedule = [
      { daysAgo: 21, weight: 78.5 },
      { daysAgo: 17, weight: 78.1 },
      { daysAgo: 14, weight: 77.8 },
      { daysAgo: 10, weight: 77.3 },
      { daysAgo: 7, weight: 76.9 },
      { daysAgo: 3, weight: 76.6 },
      { daysAgo: 0, weight: 76.4 },
    ];

    for (const ws of weightSchedule) {
      const wDate = new Date(now);
      wDate.setDate(now.getDate() - ws.daysAgo);
      const dateStr = formatToLocalDateString(wDate);

      await prisma.weightEntry.create({
        data: {
          userId: demoUser.id,
          weightKg: ws.weight,
          date: dateStr,
          recordedAt: wDate,
        },
      });
    }

    // 6. Save a Sample Diet Plan for Demo User
    await prisma.dietPlan.create({
      data: {
        userId: demoUser.id,
        budget: 180,
        dietType: 'non-vegetarian',
        excludedFoods: JSON.stringify([]),
        targetCalories: 2150,
        targetProtein: 145,
        totalCost: 172,
        totalCalories: 2140,
        totalProtein: 148,
        mealsJson: JSON.stringify([
          { name: 'Breakfast', foods: ['Oats', 'Eggs', 'Banana'], calories: 520, protein: 32 },
          { name: 'Lunch', foods: ['Chicken Breast', 'Rice', 'Curd'], calories: 720, protein: 55 },
          { name: 'Evening Snack', foods: ['Peanut Butter Toast', 'Milk'], calories: 380, protein: 20 },
          { name: 'Dinner', foods: ['Paneer / Dal', 'Roti', 'Salad'], calories: 520, protein: 41 },
        ]),
        createdAt: new Date(startDate),
      },
    });

    // 7. Sync workout_logs.json
    await syncWorkoutLogsJson();

    return NextResponse.json({
      success: true,
      message: 'Demo profile and 3-week realistic history created successfully.',
      user: demoUser,
    });
  } catch (err: unknown) {
    console.error('Failed to generate demo data:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: clean up demo profile and demo records ONLY
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  try {
    const demoUsers = await prisma.user.findMany({
      where: {
        OR: [{ name: DEMO_USER_NAME }, { isDemo: true }],
      },
      select: { id: true, name: true },
    });

    if (demoUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No demo data found to delete.' });
    }

    for (const user of demoUsers) {
      // Prisma cascade deletes workoutDays, dayExercises, logs, weightEntries, userBadges, dietPlans
      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    await syncWorkoutLogsJson();

    return NextResponse.json({
      success: true,
      message: `Deleted ${demoUsers.length} demo profile(s) and associated records cleanly.`,
    });
  } catch (err: unknown) {
    console.error('Failed to delete demo data:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
