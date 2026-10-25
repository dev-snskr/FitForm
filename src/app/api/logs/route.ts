// FitForm Workout Logs API Route
// Handles log creation, listing, file synchronization, and JSON/CSV export.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncWorkoutLogsToJson } from '@/lib/syncLogs';

export const dynamic = 'force-dynamic';

// Helper to escape CSV fields
function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET: list all logs, or export as JSON or CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format'); // 'json' | 'csv' | null
    const userIdParam = searchParams.get('userId');

    const whereClause: { userId?: number } = {};
    if (userIdParam) {
      const uid = parseInt(userIdParam, 10);
      if (!isNaN(uid)) {
        whereClause.userId = uid;
      }
    }

    const logs = await prisma.workoutLog.findMany({
      where: whereClause,
      orderBy: { completedAt: 'desc' },
    });

    const parsedLogs = logs.map((log) => {
      let mistakes: string[] = [];
      if (log.mistakes) {
        try {
          const parsed = JSON.parse(log.mistakes);
          mistakes = Array.isArray(parsed) ? parsed : [log.mistakes];
        } catch {
          mistakes = log.mistakes.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      return {
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        dayNumber: log.dayNumber,
        exercise: log.exercise,
        setNumber: log.setNumber,
        reps: log.reps,
        formScore: log.formScore,
        mistakes,
        restSeconds: log.restSeconds,
        mode: log.mode,
        completedAt: log.completedAt.toISOString(),
      };
    });

    // Handle CSV export
    if (format === 'csv') {
      const headers = [
        'ID',
        'User Name',
        'Day Number',
        'Exercise',
        'Set',
        'Reps',
        'Form Score',
        'Mistakes',
        'Rest (s)',
        'Mode',
        'Date Time',
      ];
      const rows = parsedLogs.map((log) => [
        escapeCsv(log.id),
        escapeCsv(log.userName),
        escapeCsv(log.dayNumber),
        escapeCsv(log.exercise),
        escapeCsv(log.setNumber),
        escapeCsv(log.reps),
        escapeCsv(log.formScore ?? 'N/A'),
        escapeCsv(log.mistakes.join('; ')),
        escapeCsv(log.restSeconds),
        escapeCsv(log.mode),
        escapeCsv(log.completedAt),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fitform_workout_logs.csv"',
        },
      });
    }

    // Handle JSON export
    if (format === 'json') {
      const jsonContent = JSON.stringify(parsedLogs, null, 2);
      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fitform_workout_logs.json"',
        },
      });
    }

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: create a new workout log and synchronize data/workout_logs.json
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      userName,
      dayNumber,
      exercise,
      setNumber,
      reps,
      formScore,
      mistakes,
      restSeconds,
      mode,
    } = body;

    // Validate required fields
    if (!userId || !userName || !dayNumber || !exercise || !setNumber || reps === undefined) {
      return NextResponse.json(
        { error: 'Missing required log fields (userId, userName, dayNumber, exercise, setNumber, reps)' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
    }

    // Format mistakes as JSON string for storage
    const mistakesStr = Array.isArray(mistakes)
      ? JSON.stringify(mistakes)
      : typeof mistakes === 'string'
      ? mistakes
      : JSON.stringify([]);

    const createdLog = await prisma.workoutLog.create({
      data: {
        userId: Number(userId),
        userName: userName.trim(),
        dayNumber: Number(dayNumber),
        exercise: exercise.trim(),
        setNumber: Number(setNumber),
        reps: Number(reps),
        formScore: formScore !== null && formScore !== undefined ? parseFloat(formScore) : null,
        mistakes: mistakesStr,
        restSeconds: Number(restSeconds || 0),
        mode: mode || 'live_camera',
      },
    });

    // Synchronize to data/workout_logs.json after EVERY log write
    await syncWorkoutLogsToJson();

    return NextResponse.json({ success: true, log: createdLog }, { status: 201 });
  } catch (error) {
    console.error('Failed to record workout log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
