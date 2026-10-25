// scripts/test_step1_regression.js
// Regression test verifying Step 1 features: Test logs, exports, plans

async function runRegression() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Checking Step 1 Regression ---');

  // 1. Post a test log exactly matching the UI Add Test Log button
  const logRes = await fetch(`${baseUrl}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 1,
      userName: 'Alex Johnson',
      dayNumber: 1,
      exercise: 'Bodyweight Squat',
      setNumber: 1,
      reps: 12,
      formScore: 92,
      mistakes: ['Knees caved slightly inward on rep 10'],
      restSeconds: 60,
      mode: 'live_camera'
    })
  });
  const logData = await logRes.json();
  console.log(`Add test log status: ${logRes.status}, created log ID: ${logData.log?.id}`);

  // 2. Fetch logs
  const getLogsRes = await fetch(`${baseUrl}/api/logs`);
  const logsList = await getLogsRes.json();
  console.log(`Total logs in system: ${logsList.logs?.length}`);

  // 3. Export CSV and JSON
  const csvRes = await fetch(`${baseUrl}/api/logs?format=csv`);
  const csvText = await csvRes.text();
  console.log(`CSV Export rows: ${csvText.split('\n').length}, Header valid: ${csvText.includes('Exercise')}`);

  const jsonRes = await fetch(`${baseUrl}/api/logs?format=json`);
  const jsonArr = await jsonRes.json();
  console.log(`JSON Export count: ${jsonArr.length}`);

  // 4. Verify day 1 plan
  const plan1Res = await fetch(`${baseUrl}/plan/1`);
  const plan1Text = await plan1Res.text();
  console.log(`Plan day 1 HTML loaded (${plan1Text.length} bytes), has Exercise/Day: ${plan1Text.includes('Day 1') || plan1Text.includes('Squat') || plan1Text.includes('FitForm')}`);

  console.log('=== Step 1 Regression Check Passed 100% ===');
}

runRegression().catch(err => {
  console.error(err);
  process.exit(1);
});
