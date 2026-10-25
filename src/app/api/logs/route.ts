// FitForm Workout Logs API Route
// Handles log creation, listing, file synchronization, and JSON/CSV export.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncWorkoutLogsToJson } from '@/lib/syncLogs';
import { evaluateAndSyncUserBadges } from '@/lib/progress/badgeChecker';

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

      const isPlank = log.exercise.toLowerCase().includes('plank');
      const durationSeconds =
        log.durationSeconds !== null && log.durationSeconds !== undefined
          ? log.durationSeconds
          : isPlank
          ? log.reps
          : null;

      return {
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        dayNumber: log.dayNumber,
        exercise: log.exercise,
        setNumber: log.setNumber,
        reps: isPlank ? 0 : log.reps,
        loadKg: log.loadKg ?? null,
        durationSeconds,
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
        'Load (kg)',
        'Duration (s)',
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
        escapeCsv(log.exercise.toLowerCase().includes('plank') ? '-' : log.reps),
        escapeCsv(log.loadKg !== null && log.loadKg !== undefined ? `${log.loadKg} kg` : 'Bodyweight'),
        escapeCsv(log.durationSeconds !== null ? `${log.durationSeconds} s` : '-'),
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
      loadKg,
      durationSeconds,
      formScore,
      mistakes,
      restSeconds,
      mode,
    } = body;

    let parsedLoadKg: number | null = null;
    if (loadKg !== undefined && loadKg !== null && loadKg !== '') {
      const parsed = parseFloat(loadKg);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 300) {
        parsedLoadKg = Number(parsed.toFixed(1));
      }
    }

    // Validate required fields (reps or durationSeconds must be provided)
    const effectiveReps = reps !== undefined ? Number(reps) : Number(durationSeconds || 0);
    if (!userId || !userName || !dayNumber || !exercise || !setNumber || isNaN(effectiveReps)) {
      return NextResponse.json(
        { error: 'Missing required log fields (userId, userName, dayNumber, exercise, setNumber, reps/durationSeconds)' },
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
        reps: effectiveReps,
        loadKg: parsedLoadKg,
        durationSeconds:
          durationSeconds !== undefined && durationSeconds !== null
            ? Number(durationSeconds)
            : exercise.toLowerCase().includes('plank')
            ? effectiveReps
            : null,
        formScore: formScore !== null && formScore !== undefined ? parseFloat(formScore) : null,
        mistakes: mistakesStr,
        restSeconds: Number(restSeconds || 0),
        mode: mode || 'live_camera',
      },
    });

    // Check for newly earned badges
    let newlyEarnedBadges: unknown[] = [];
    try {
      const badgeSync = await evaluateAndSyncUserBadges(Number(userId));
      newlyEarnedBadges = badgeSync.newlyEarnedBadges;
    } catch (badgeErr) {
      console.warn('Failed to evaluate badges on set log:', badgeErr);
    }

    // Synchronize to data/workout_logs.json after EVERY log write
    await syncWorkoutLogsToJson();

    return NextResponse.json(
      { success: true, log: createdLog, newlyEarnedBadges },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to record workout log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: update actual rest seconds for a saved set log (called when rest timer finishes or is skipped)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { logId, restSeconds } = body;

    if (!logId || restSeconds === undefined || isNaN(Number(restSeconds))) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: logId and numeric restSeconds required' },
        { status: 400 }
      );
    }

    const id = Number(logId);
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return NextResponse.json({ error: 'Workout log not found' }, { status: 404 });
    }

    const updatedLog = await prisma.workoutLog.update({
      where: { id },
      data: {
        restSeconds: Math.max(0, Math.round(Number(restSeconds))),
      },
    });

    // Synchronize to data/workout_logs.json
    await syncWorkoutLogsToJson();

    return NextResponse.json({ success: true, log: updatedLog });
  } catch (error) {
    console.error('Failed to update workout log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
