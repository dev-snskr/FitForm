// scripts/auditDb.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { logs: true, weightEntries: true, badges: true, workoutDays: true, dietPlans: true }
      }
    }
  });
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));

  const logs = await prisma.workoutLog.findMany();
  console.log('\n--- TOTAL LOGS IN DB ---', logs.length);
  const logsByUser = {};
  logs.forEach(l => {
    logsByUser[l.userId] = (logsByUser[l.userId] || 0) + 1;
  });
  console.log('Logs count by userId:', logsByUser);

  // Check user Sanskar
  const sanskar = users.find(u => u.name.toLowerCase().includes('sanskar'));
  if (sanskar) {
    const sanskarLogs = await prisma.workoutLog.findMany({
      where: { userId: sanskar.id },
      orderBy: { completedAt: 'asc' }
    });
    console.log(`\n--- SANSKAR (ID ${sanskar.id}) LOGS COUNT ---`, sanskarLogs.length);
    console.log('Sanskar logs:', sanskarLogs.map(l => ({
      id: l.id,
      day: l.dayNumber,
      exercise: l.exercise,
      set: l.setNumber,
      reps: l.reps,
      durationSeconds: l.durationSeconds,
      formScore: l.formScore,
      mistakes: l.mistakes,
      completedAt: l.completedAt
    })));

    const weightEntries = await prisma.weightEntry.findMany({
      where: { userId: sanskar.id }
    });
    console.log('Sanskar weight entries:', weightEntries);

    const badges = await prisma.userBadge.findMany({
      where: { userId: sanskar.id }
    });
    console.log('Sanskar badges:', badges);
  }
}

main().finally(() => prisma.$disconnect());
