import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== Testing Full Workout Flow & Logging for Squat, Push-Up, and Bicep Curl ===");

  // 1. Get or create a test user
  const usersRes = await fetch('http://localhost:3000/api/users');
  const usersData = await usersRes.json();
  let user = usersData.users?.[0];

  if (!user) {
    console.log("Creating test user...");
    const createRes = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Test',
        age: 25,
        gender: 'male',
        heightCm: 175,
        weightKg: 70,
        goal: 'muscle_gain',
        experience: 'intermediate',
        daysPerWeek: 4
      })
    });
    const createData = await createRes.json();
    user = createData.user;
  }

  console.log(`Using active user: ${user.name} (ID: ${user.id})`);

  // 2. Post logs for all 3 exercises
  const testExercises = [
    {
      exercise: 'Bodyweight Squat',
      reps: 12,
      formScore: 92,
      mistakes: ['Not deep enough'],
      mode: 'live_camera'
    },
    {
      exercise: 'Push-Up',
      reps: 10,
      formScore: 85,
      mistakes: ['Go lower'],
      mode: 'live_camera'
    },
    {
      exercise: 'Bicep Curl',
      reps: 14,
      formScore: 80,
      mistakes: ['Swinging your body'],
      mode: 'live_camera'
    }
  ];

  for (let i = 0; i < testExercises.length; i++) {
    const item = testExercises[i];
    console.log(`\nLogging Set for ${item.exercise} (reps: ${item.reps}, score: ${item.formScore})...`);

    const logRes = await fetch('http://localhost:3000/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        dayNumber: 1,
        exercise: item.exercise,
        setNumber: i + 1,
        reps: item.reps,
        formScore: item.formScore,
        mistakes: item.mistakes,
        restSeconds: 60,
        mode: item.mode
      })
    });

    if (!logRes.ok) {
      throw new Error(`Failed to log set for ${item.exercise}: HTTP ${logRes.status}`);
    }

    const logResult = await logRes.json();
    console.log(`  ✓ Logged successfully (Log ID: ${logResult.log.id})`);
  }

  // 3. Verify GET /api/logs
  console.log("\nVerifying GET /api/logs API response...");
  const fetchLogsRes = await fetch('http://localhost:3000/api/logs');
  const fetchLogsData = await fetchLogsRes.json();
  const logs = fetchLogsData.logs || [];

  for (const item of testExercises) {
    const found = logs.find(l => l.exercise === item.exercise && l.reps === item.reps);
    if (!found) {
      throw new Error(`Missing expected log for ${item.exercise} in /api/logs!`);
    }
    console.log(`  ✓ Verified ${item.exercise} appears in GET /api/logs`);
  }

  // 4. Verify data/workout_logs.json sync
  console.log("\nVerifying data/workout_logs.json on disk...");
  const jsonFilePath = path.resolve(process.cwd(), 'data', 'workout_logs.json');
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`data/workout_logs.json file does not exist at ${jsonFilePath}`);
  }

  const fileRaw = fs.readFileSync(jsonFilePath, 'utf8');
  const fileLogs = JSON.parse(fileRaw);
  console.log(`  Found ${fileLogs.length} total logs written in data/workout_logs.json`);

  for (const item of testExercises) {
    const found = fileLogs.find(l => l.exercise === item.exercise && l.reps === item.reps);
    if (!found) {
      throw new Error(`data/workout_logs.json missing ${item.exercise}!`);
    }
    console.log(`  ✓ Verified ${item.exercise} synced to data/workout_logs.json`);
  }

  console.log("\n✅ ALL WORKOUT FLOW & LOGGING CHECKS PASSED!");
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
