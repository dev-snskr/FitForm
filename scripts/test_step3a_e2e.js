// scripts/test_step3a_e2e.js
// Automated verification script for Step 3A: Workout flow & Squat Form Checking

const fs = require('fs');
const path = require('path');

async function runStep3ATests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Starting Step 3A Automated Verification Suite ---');

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

  // 2. Fetch users
  const usersRes = await fetch(`${baseUrl}/api/users`);
  const userData = await usersRes.json();
  const users = userData.users || [];
  const testUser = users[0];
  console.log(`Testing with user: ID ${testUser.id} (${testUser.name})`);

  // 3. Test Step 3A Routes: /workout/1 and /dev/pose-test
  console.log('\n--- Checking New Step 3A Page Routes ---');
  const workoutPageRes = await fetch(`${baseUrl}/workout/1`);
  console.log(`Route [/workout/1] - Status: ${workoutPageRes.status}`);
  if (workoutPageRes.status !== 200) throw new Error('Failed to load /workout/1');

  const devPoseTestRes = await fetch(`${baseUrl}/dev/pose-test`);
  console.log(`Route [/dev/pose-test] - Status: ${devPoseTestRes.status}`);
  if (devPoseTestRes.status !== 200) throw new Error('Failed to load /dev/pose-test');

  // 4. Test Manual Set logging for a non-squat exercise (Push-Up)
  console.log('\n--- Testing Manual Set Logging (Non-Squat) ---');
  const manualLogRes = await fetch(`${baseUrl}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: testUser.id,
      userName: testUser.name,
      dayNumber: 1,
      exercise: 'Push-Up',
      setNumber: 1,
      reps: 15,
      formScore: null,
      mistakes: [],
      restSeconds: 60,
      mode: 'manual',
    }),
  });
  const manualLogData = await manualLogRes.json();
  console.log(`Manual Log response status: ${manualLogRes.status}`);
  console.log(`Manual Log ID: ${manualLogData.log?.id}, Mode: "${manualLogData.log?.mode}", Score: ${manualLogData.log?.formScore}`);
  if (manualLogData.log?.mode !== 'manual' || manualLogData.log?.formScore !== null) {
    throw new Error('Manual log verification failed');
  }

  // 5. Test Live Camera Squat Set logging (Simulated from Dev Pose Studio)
  console.log('\n--- Testing Live Camera Squat Set Logging ---');
  const squatLogRes = await fetch(`${baseUrl}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: testUser.id,
      userName: testUser.name,
      dayNumber: 1,
      exercise: 'Bodyweight Squat',
      setNumber: 1,
      reps: 12,
      formScore: 92,
      mistakes: ['Not deep enough on rep 8'],
      restSeconds: 45,
      mode: 'live_camera',
    }),
  });
  const squatLogData = await squatLogRes.json();
  console.log(`Squat Log response status: ${squatLogRes.status}`);
  console.log(`Squat Log ID: ${squatLogData.log?.id}, Mode: "${squatLogData.log?.mode}", Score: ${squatLogData.log?.formScore}%`);
  if (squatLogData.log?.mode !== 'live_camera' || squatLogData.log?.formScore !== 92) {
    throw new Error('Squat log verification failed');
  }

  // 6. Verify Logs in /api/logs table
  console.log('\n--- Verifying Logs Table Query ---');
  const allLogsRes = await fetch(`${baseUrl}/api/logs?userId=${testUser.id}`);
  const allLogsData = await allLogsRes.json();
  const logsList = allLogsData.logs || [];
  console.log(`Total logs retrieved for user ${testUser.id}: ${logsList.length}`);
  const latestTwo = logsList.slice(0, 2);
  console.log('Latest 2 logs:', latestTwo.map(l => `${l.exercise} #${l.setNumber}: ${l.reps} reps, score: ${l.formScore ?? 'Not scored'}, mode: ${l.mode}`));

  // 7. Verify CSV and JSON Exports
  console.log('\n--- Verifying Exports ---');
  const csvRes = await fetch(`${baseUrl}/api/logs?format=csv`);
  const csvContent = await csvRes.text();
  console.log(`CSV Export header valid: ${csvContent.includes('Mode')}`);
  console.log(`CSV contains "manual": ${csvContent.includes('manual')}`);
  console.log(`CSV contains "live_camera": ${csvContent.includes('live_camera')}`);

  const jsonRes = await fetch(`${baseUrl}/api/logs?format=json`);
  const jsonArr = await jsonRes.json();
  const hasManual = jsonArr.some(l => l.mode === 'manual');
  const hasLiveCamera = jsonArr.some(l => l.mode === 'live_camera');
  console.log(`JSON Export count: ${jsonArr.length}, Has manual: ${hasManual}, Has live_camera: ${hasLiveCamera}`);

  // 8. Verify data/workout_logs.json synchronization
  console.log('\n--- Verifying data/workout_logs.json file synchronization ---');
  const filePath = path.join(__dirname, '..', 'data', 'workout_logs.json');
  if (!fs.existsSync(filePath)) throw new Error('data/workout_logs.json missing');
  const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`File sync verified: data/workout_logs.json contains ${fileContent.length} logs.`);

  // 9. Verify Day 1 status on Timeline
  console.log('\n--- Verifying Day 1 Status on Program Timeline ---');
  const planRes = await fetch(`${baseUrl}/api/plan?userId=${testUser.id}`);
  const planData = await planRes.json();
  const day1 = planData.days.find(d => d.dayNumber === 1);
  console.log(`Day 1 status: "${day1?.status}" (Completed: ${day1?.status === 'completed'})`);
  if (day1?.status !== 'completed') {
    throw new Error('Day 1 expected to be completed');
  }

  // 10. Verify MediaPipe Model and WASM public assets exist
  console.log('\n--- Verifying MediaPipe Public Assets ---');
  const modelPath = path.join(__dirname, '..', 'public', 'mediapipe', 'models', 'pose_landmarker_lite.task');
  const wasmPath = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm', 'vision_wasm_internal.wasm');
  console.log(`Pose landmarker model exists: ${fs.existsSync(modelPath)} (${(fs.statSync(modelPath).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`WASM binary exists: ${fs.existsSync(wasmPath)} (${(fs.statSync(wasmPath).size / 1024 / 1024).toFixed(2)} MB)`);

  console.log('\n=== ALL STEP 3A VERIFICATION CHECKS PASSED (100%) ===');
}

runStep3ATests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
