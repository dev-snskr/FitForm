// src/app/api/workout/feedback/route.ts
// FitForm Post-Workout Rating of Perceived Exertion (RPE) Feedback API
// Allows users to rate how their session felt on a 1-5 scale (Very Easy to Very Hard)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, dayNumber, rpeScore, feedback } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 });
    }

    const day = Number(dayNumber);
    const score = Number(rpeScore);

    if (isNaN(day) || isNaN(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Invalid parameters: rpeScore must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    const savedFeedback = await prisma.workoutFeedback.upsert({
      where: {
        userId_dayNumber: {
          userId,
          dayNumber: day,
        },
      },
      update: {
        rpeScore: score,
        feedback: feedback ? String(feedback).trim() : null,
        createdAt: new Date(),
      },
      create: {
        userId,
        dayNumber: day,
        rpeScore: score,
        feedback: feedback ? String(feedback).trim() : null,
      },
    });

    return NextResponse.json({ success: true, feedback: savedFeedback });
  } catch (err: unknown) {
    console.error('Error saving workout feedback:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
