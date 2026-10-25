// FitForm Workout Log Synchronization
// Ensures the SQLite database remains the single source of truth,
// and regenerates `data/workout_logs.json` synchronously after every write operation.

import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

export interface FormattedWorkoutLog {
  id: number;
  userId: number;
  userName: string;
  dayNumber: number;
  exercise: string;
  setNumber: number;
  reps: number;
  durationSeconds?: number | null;
  formScore: number | null;
  mistakes: string[];
  restSeconds: number;
  mode: 'live_camera' | 'video_upload' | 'manual';
  completedAt: string;
}

export async function syncWorkoutLogsToJson(): Promise<FormattedWorkoutLog[]> {
  try {
    const logsFromDb = await prisma.workoutLog.findMany({
      orderBy: { completedAt: 'desc' },
    });

    const formattedLogs: FormattedWorkoutLog[] = logsFromDb.map((log) => {
      let parsedMistakes: string[] = [];
      if (log.mistakes) {
        try {
          const parsed = JSON.parse(log.mistakes);
          parsedMistakes = Array.isArray(parsed) ? parsed : [log.mistakes];
        } catch {
          // If not JSON, split by comma or take as single string
          parsedMistakes = log.mistakes.split(',').map((s) => s.trim()).filter(Boolean);
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
        durationSeconds,
        formScore: log.formScore,
        mistakes: parsedMistakes,
        restSeconds: log.restSeconds,
        mode: log.mode as 'live_camera' | 'video_upload' | 'manual',
        completedAt: log.completedAt.toISOString(),
      };
    });

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const targetFilePath = path.join(dataDir, 'workout_logs.json');
    fs.writeFileSync(targetFilePath, JSON.stringify(formattedLogs, null, 2), 'utf-8');

    return formattedLogs;
  } catch (error) {
    console.error('Error synchronizing workout logs to JSON file:', error);
    throw error;
  }
}
