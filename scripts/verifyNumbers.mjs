import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { name: 'Sanskar' } });
  if (!user) {
    console.log('No user Sanskar found');
    return;
  }
  console.log(`User: ID=${user.id}, Name=${user.name}, Weight=${user.weightKg}kg, TargetWeight=${user.targetWeightKg}, Waist=${user.waistCm}`);

  const logs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: 'asc' },
  });
  console.log(`1. Total Sets Logged in DB: ${logs.length}`);

  const totalReps = logs.reduce((acc, l) => acc + (l.reps || 0), 0);
  console.log(`2. Total Reps in DB: ${totalReps}`);

  const totalPlankSeconds = logs.reduce((acc, l) => acc + (l.durationSeconds || 0), 0);
  console.log(`3. Total Plank Seconds in DB: ${totalPlankSeconds}s`);

  const distinctDays = new Set(logs.map((l) => l.dayNumber));
  console.log(`4. Distinct Workout Days Completed: ${distinctDays.size} (Days: ${Array.from(distinctDays).sort((a,b)=>a-b).join(', ')})`);

  const weightEntries = await prisma.weightEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: 'asc' },
  });
  console.log(`5. Weight Entries Count: ${weightEntries.length}, Initial: ${weightEntries[0]?.weightKg}kg on ${weightEntries[0]?.date}`);

  // Also check data/workout_logs.json if it exists
  if (fs.existsSync('data/workout_logs.json')) {
    const jsonLogs = JSON.parse(fs.readFileSync('data/workout_logs.json', 'utf8'));
    console.log(`data/workout_logs.json exists with ${jsonLogs.length} total entries.`);
  } else {
    console.log('data/workout_logs.json does not exist yet.');
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
