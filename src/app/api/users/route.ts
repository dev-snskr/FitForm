// FitForm Users API Route
// Handles user creation with automatic 30-day plan generation and profile listing.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUserProfile } from '@/lib/validation';
import { generate30DayPlan } from '@/lib/planGenerator';
import { formatToLocalDateString } from '@/lib/progress/streakCalculator';

export const dynamic = 'force-dynamic';

// GET: list all profiles or get a specific user by id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          workoutDays: {
            include: { exercises: true },
            orderBy: { dayNumber: 'asc' },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        heightCm: true,
        weightKg: true,
        goal: true,
        experience: true,
        daysPerWeek: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: create a new user profile and generate the 30-day plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate inputs strictly
    const validation = validateUserProfile(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const {
      name,
      age,
      gender,
      heightCm,
      weightKg,
      targetWeightKg,
      waistCm,
      goal,
      experience,
      daysPerWeek,
    } = body;

    const parsedTargetWeight = targetWeightKg ? parseFloat(targetWeightKg) : null;
    const parsedWaistCm = waistCm ? parseFloat(waistCm) : null;

    // Generate deterministic 30-day plan
    const generatedDays = generate30DayPlan(goal, experience, Number(daysPerWeek));

    // Save user + 30-day plan into SQLite atomically
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          age: Number(age),
          gender: gender.toLowerCase(),
          heightCm: parseFloat(heightCm),
          weightKg: parseFloat(weightKg),
          targetWeightKg: parsedTargetWeight,
          waistCm: parsedWaistCm,
          goal: goal.toLowerCase(),
          experience: experience.toLowerCase(),
          daysPerWeek: Number(daysPerWeek),
        },
      });

      // Seed initial onboarding weight entry (with optional initial waist)
      await tx.weightEntry.create({
        data: {
          userId: user.id,
          weightKg: parseFloat(weightKg),
          waistCm: parsedWaistCm,
          date: formatToLocalDateString(new Date()),
        },
      });

      // Create all 30 days and their exercises
      for (const day of generatedDays) {
        const createdDay = await tx.workoutDay.create({
          data: {
            userId: user.id,
            dayNumber: day.dayNumber,
            workoutType: day.workoutType,
            isRest: day.isRest,
          },
        });

        if (day.exercises.length > 0) {
          await tx.dayExercise.createMany({
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

      return user;
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user and plan:', error);
    return NextResponse.json(
      { error: 'Failed to create user profile. Please check your data and try again.' },
      { status: 500 }
    );
  }
}

// PATCH: update user profile (e.g. target weight, waist circumference)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, targetWeightKg, waistCm } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 });
    }

    const updateData: { targetWeightKg?: number | null; waistCm?: number | null } = {};

    if (targetWeightKg !== undefined) {
      if (targetWeightKg === null || targetWeightKg === '') {
        updateData.targetWeightKg = null;
      } else {
        const val = parseFloat(targetWeightKg);
        if (isNaN(val) || val < 30 || val > 250) {
          return NextResponse.json({ error: 'Target weight must be between 30 and 250 kg' }, { status: 400 });
        }
        updateData.targetWeightKg = val;
      }
    }

    if (waistCm !== undefined) {
      if (waistCm === null || waistCm === '') {
        updateData.waistCm = null;
      } else {
        const val = parseFloat(waistCm);
        if (isNaN(val) || val < 40 || val > 200) {
          return NextResponse.json({ error: 'Waist circumference must be between 40 and 200 cm' }, { status: 400 });
        }
        updateData.waistCm = val;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
