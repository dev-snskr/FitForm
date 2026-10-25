// scripts/testStep5Flow.mjs
// Verifies Step 5 End-to-End Analytics, Streaks, Badges, Weight Tracking, and Demo Data

async function main() {
  console.log('--- Step 5 Automated End-to-End Verification ---');

  const baseUrl = 'http://localhost:3000';

  console.log('1. Checking dev server availability...');
  try {
    const ping = await fetch(`${baseUrl}/api/users`);
    if (!ping.ok) throw new Error('Server returned non-200');
  } catch (err) {
    console.error('Next.js dev server is not reachable on port 3000:', err);
    process.exit(1);
  }

  console.log('2. Testing Demo Data Generation (POST /api/dev/demo-data)...');
  const demoPostRes = await fetch(`${baseUrl}/api/dev/demo-data`, { method: 'POST' });
  if (!demoPostRes.ok) {
    throw new Error(`Demo data generation failed: ${await demoPostRes.text()}`);
  }
  const demoData = await demoPostRes.json();
  const demoUserId = demoData.user?.id;
  console.log(`Demo User created with ID=${demoUserId}, Name=${demoData.user?.name}`);

  console.log('3. Fetching Progress Dashboard Data for Demo User (GET /api/progress)...');
  const progressRes = await fetch(`${baseUrl}/api/progress?userId=${demoUserId}`);
  if (!progressRes.ok) {
    throw new Error(`Failed to load progress data: ${await progressRes.text()}`);
  }
  const progress = await progressRes.json();

  console.log('   - Total Workouts Completed:', progress.summary.totalWorkoutsCompleted);
  console.log('   - Current Streak:', progress.streak.currentStreak);
  console.log('   - Longest Streak:', progress.streak.longestStreak);
  console.log('   - Average Form Score:', progress.summary.averageFormScore);
  console.log('   - Best Set:', progress.summary.bestSet);
  console.log('   - Weight Delta:', progress.charts.weightHistory.weightDelta);

  if (!progress.summary.averageFormScore || progress.summary.averageFormScore < 70) {
    throw new Error('Expected realistic average form score >= 70');
  }

  if (progress.summary.totalWorkoutsCompleted < 10) {
    throw new Error('Expected at least 10 completed workouts for 3 weeks demo history');
  }

  console.log('4. Checking Badges Unlocked for Demo User...');
  const unlockedBadges = progress.badges.filter((b) => b.isUnlocked);
  console.log(`   Unlocked ${unlockedBadges.length} of ${progress.badges.length} badges:`);
  unlockedBadges.forEach((b) => console.log(`     ✓ ${b.name} (${b.id})`));

  const requiredDemoUnlocks = [
    'first_workout',
    'halfway',
    'comeback',
    'first_perfect_form',
    'perfect_5',
    'diet_planner',
  ];
  for (const reqId of requiredDemoUnlocks) {
    const found = unlockedBadges.find((b) => b.id === reqId);
    if (!found) {
      throw new Error(`Expected badge '${reqId}' to be unlocked for demo user`);
    }
  }

  console.log('5. Testing Weight Tracking Validation (POST /api/weight)...');
  // Sub-30kg invalid
  const lowWeightRes = await fetch(`${baseUrl}/api/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: demoUserId, weightKg: 25 }),
  });
  if (lowWeightRes.status !== 400) {
    throw new Error(`Expected 400 for 25kg weight, got ${lowWeightRes.status}`);
  }

  // Over-250kg invalid
  const highWeightRes = await fetch(`${baseUrl}/api/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: demoUserId, weightKg: 300 }),
  });
  if (highWeightRes.status !== 400) {
    throw new Error(`Expected 400 for 300kg weight, got ${highWeightRes.status}`);
  }

  // Valid weight log
  const validWeightRes = await fetch(`${baseUrl}/api/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: demoUserId, weightKg: 75.8, date: '2026-10-25' }),
  });
  if (!validWeightRes.ok) {
    throw new Error(`Failed to log valid weight: ${await validWeightRes.text()}`);
  }
  const weightJson = await validWeightRes.json();
  console.log('   Logged weight successfully:', weightJson.entry);

  // Check JSON export
  const exportRes = await fetch(`${baseUrl}/api/weight?userId=${demoUserId}&format=json`);
  if (!exportRes.ok) {
    throw new Error(`Weight JSON export failed: ${exportRes.status}`);
  }
  const exportJson = await exportRes.json();
  if (!exportJson.entries || exportJson.entries.length === 0) {
    throw new Error('Exported JSON has no weight entries');
  }
  console.log(`   Exported JSON verified with ${exportJson.entries.length} weight entries.`);

  console.log('6. Testing Demo Data Cleanup (DELETE /api/dev/demo-data)...');
  const deleteRes = await fetch(`${baseUrl}/api/dev/demo-data`, { method: 'DELETE' });
  if (!deleteRes.ok) {
    throw new Error(`Failed to delete demo data: ${await deleteRes.text()}`);
  }
  const deleteData = await deleteRes.json();
  console.log('   Delete response:', deleteData.message);

  // Verify demo user is gone
  const checkRes = await fetch(`${baseUrl}/api/dev/demo-data`);
  const checkData = await checkRes.json();
  if (checkData.exists) {
    throw new Error('Demo user still exists after deletion!');
  }
  console.log('   Verified Demo User cleanly eliminated.');

  console.log('--- ALL STEP 5 FLOW VERIFICATIONS PASSED ---');
}

main().catch((err) => {
  console.error('Step 5 verification error:', err);
  process.exit(1);
});
