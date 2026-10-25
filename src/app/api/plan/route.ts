// FitForm Plan API Route
// Retrieves the 30-day plan and individual day details along with workout completion status.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const dayParam = searchParams.get('day');

    if (!userIdParam) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        goal: true,
        experience: true,
        daysPerWeek: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Single day request
    if (dayParam) {
      const dayNumber = parseInt(dayParam, 10);
      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
        return NextResponse.json({ error: 'Invalid day number (must be 1-30)' }, { status: 400 });
      }

      const day = await prisma.workoutDay.findUnique({
        where: {
          userId_dayNumber: {
            userId,
            dayNumber,
          },
        },
        include: {
          exercises: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!day) {
        return NextResponse.json({ error: 'Workout day not found' }, { status: 404 });
      }

      // Check if any logs exist for this user and day
      const logs = await prisma.workoutLog.findMany({
        where: { userId, dayNumber },
        orderBy: { completedAt: 'desc' },
      });

      return NextResponse.json({
        user,
        day,
        isCompleted: logs.length > 0,
        logs,
      });
    }

    // All 30 days request
    const workoutDays = await prisma.workoutDay.findMany({
      where: { userId },
      orderBy: { dayNumber: 'asc' },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Find all distinct completed day numbers from logs for this user
    const completedLogs = await prisma.workoutLog.findMany({
      where: { userId },
      select: { dayNumber: true },
      distinct: ['dayNumber'],
    });

    const completedDaySet = new Set(completedLogs.map((l) => l.dayNumber));

    const formattedDays = workoutDays.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      workoutType: day.workoutType,
      isRest: day.isRest,
      exerciseCount: day.exercises.length,
      status: completedDaySet.has(day.dayNumber) ? 'completed' : 'not_started',
    }));

    return NextResponse.json({
      user,
      days: formattedDays,
    });
  } catch (error) {
    console.error('Failed to retrieve workout plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
