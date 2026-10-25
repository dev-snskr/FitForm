import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function run() {
  const logsFromDb = await prisma.workoutLog.findMany({
    orderBy: { completedAt: 'desc' },
  });

  const formattedLogs = logsFromDb.map((log) => {
    let parsedMistakes = [];
    if (log.mistakes) {
      try {
        const parsed = JSON.parse(log.mistakes);
        parsedMistakes = Array.isArray(parsed) ? parsed : [log.mistakes];
      } catch {
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
      loadKg: log.loadKg ?? null,
      durationSeconds,
      formScore: log.formScore,
      mistakes: parsedMistakes,
      restSeconds: log.restSeconds,
      mode: log.mode,
      completedAt: log.completedAt.toISOString(),
    };
  });

  const target = path.join(process.cwd(), 'data', 'workout_logs.json');
  fs.writeFileSync(target, JSON.stringify(formattedLogs, null, 2), 'utf8');
  console.log(`Synced ${formattedLogs.length} logs to data/workout_logs.json with loadKg.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
