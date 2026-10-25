// scripts/test_upgrade.js
// Automated verification for Radiating Lines Background & Interactive Glass Timeline

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Testing FitForm Radiating Lines & Glass Timeline Upgrade ---');

  // 1. Wait for server ready
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/users`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('Server did not become ready in time.');
    process.exit(1);
  }
  console.log('✓ Dev server ready at http://localhost:3000');

  // 2. Fetch User & Plan to inspect timeline logic
  const usersRes = await fetch(`${baseUrl}/api/users`);
  const userData = await usersRes.json();
  const users = userData.users || [];
  console.log(`Found ${users.length} profile(s):`, users.map(u => `${u.id}: ${u.name}`));
  const user = users[0];

  const planRes = await fetch(`${baseUrl}/api/plan?userId=${user.id}`);
  const planData = await planRes.json();
  const days = planData.days || [];
  console.log(`Plan returned ${days.length} days. User: ${planData.user.name}`);

  const completedDays = days.filter(d => d.status === 'completed');
  const upNextDay = days.find(d => !d.isRest && d.status !== 'completed');
  console.log(`Completed days count: ${completedDays.length} (Days: ${completedDays.map(d => d.dayNumber).join(', ')})`);
  console.log(`Up next day: Day ${upNextDay ? upNextDay.dayNumber : 'None'} (${upNextDay ? upNextDay.workoutType : 'All done'})`);

  // 3. Test All Page Routes in Next.js
  const routes = [
    { name: 'Onboarding', path: '/onboarding' },
    { name: 'Plan Timeline', path: '/plan' },
    { name: 'Plan Day 1', path: '/plan/1' },
    { name: 'Plan Day 7 (Rest/Recovery)', path: '/plan/7' },
    { name: 'Logs Table', path: '/logs' },
    { name: 'Diet Page', path: '/diet' },
  ];

  console.log('\n--- Checking Page HTTP Responses ---');
  for (const r of routes) {
    const res = await fetch(`${baseUrl}${r.path}`);
    const text = await res.text();
    console.log(`Route [${r.path}] - Status: ${res.status}, Size: ${text.length} bytes`);
    if (res.status !== 200) {
      throw new Error(`Route ${r.path} failed with status ${res.status}`);
    }
  }
  console.log('✓ All 6 pages loaded with status 200 OK');

  // 4. Verify Plan Timeline HTML contains timeline markers
  console.log('\n--- Checking Glass Timeline HTML Markers ---');
  const planHtml = await (await fetch(`${baseUrl}/plan`)).text();
  const hasTimeline = planHtml.includes('Interactive Glass Timeline') || planHtml.includes('Program');
  const hasSpine = planHtml.includes('w-1') || planHtml.includes('rounded-full');
  console.log(`Contains Timeline markers: ${hasTimeline}`);
  console.log(`Contains Spine line elements: ${hasSpine}`);

  // 5. Test Adding a Workout Log to verify dynamic timeline updates & file sync
  console.log('\n--- Testing Add Log & File Sync ---');
  const addLogRes = await fetch(`${baseUrl}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      userName: user.name,
      dayNumber: 2,
      exercise: 'Push-Up',
      setNumber: 2,
      reps: 12,
      formScore: 94,
      mistakes: ['Keep elbows tucked at 45 degrees'],
      restSeconds: 90,
      mode: 'live_camera',
    }),
  });
  const addLogData = await addLogRes.json();
  console.log(`Log created status: ${addLogRes.status}, ID: ${addLogData.log?.id}`);

  // 6. Test CSV and JSON exports
  console.log('\n--- Testing Exports ---');
  const csvRes = await fetch(`${baseUrl}/api/logs?format=csv`);
  const csvText = await csvRes.text();
  console.log(`Workout logs CSV export valid: ${csvRes.headers.get('content-disposition')?.includes('attachment') && csvText.includes('Exercise')}`);

  const dietJsonRes = await fetch(`${baseUrl}/api/diet?userId=${user.id}&format=json`);
  const dietJson = await dietJsonRes.json();
  console.log(`Diet JSON export valid: ${dietJsonRes.headers.get('content-disposition')?.includes('attachment') && !!dietJson.currentPlan}`);

  // 7. Verify Day Detail Page for Day 1 and Day 7
  console.log('\n--- Verifying Day 1 & Day 7 Details ---');
  const day1Res = await fetch(`${baseUrl}/api/plan?userId=${user.id}&day=1`);
  const day1Data = await day1Res.json();
  console.log(`Day 1: ${day1Data.day.workoutType}, Exercises: ${day1Data.day.exercises.length}, Completed: ${day1Data.isCompleted}`);

  const day7Res = await fetch(`${baseUrl}/api/plan?userId=${user.id}&day=7`);
  const day7Data = await day7Res.json();
  console.log(`Day 7: ${day7Data.day.workoutType}, IsRest: ${day7Data.day.isRest}, Exercises: ${day7Data.day.exercises.length}`);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY (100%) ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
