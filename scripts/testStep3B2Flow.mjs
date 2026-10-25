// scripts/testStep3B2Flow.mjs
// Verifies Step 3B-2: Lunge & Plank logging, CSV & JSON exports, and file sync.

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing Step 3B-2 End-to-End API and File Flow...');

  // 1. Get or create a user
  const usersRes = await fetch(`${BASE_URL}/api/users`);
  if (!usersRes.ok) throw new Error('Failed to fetch users');
  const usersData = await usersRes.json();
  const user = usersData.users?.[0];
  if (!user) throw new Error('No users found in database');

  console.log(`Using test user: ${user.name} (id: ${user.id})`);

  // 2. Post a Lunge log
  const lungePayload = {
    userId: user.id,
    userName: user.name,
    dayNumber: 4,
    exercise: 'Walking / Static Lunge',
    setNumber: 1,
    reps: 10,
    durationSeconds: null,
    formScore: 95,
    mistakes: [],
    restSeconds: 60,
    mode: 'live_camera',
  };

  const lungeRes = await fetch(`${BASE_URL}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lungePayload),
  });
  if (!lungeRes.ok) throw new Error(`Failed to log lunge: ${await lungeRes.text()}`);
  const lungeData = await lungeRes.json();
  console.log('✓ Lunge logged successfully:', lungeData.log.exercise, 'id:', lungeData.log.id);

  // 3. Post a Plank log (timed hold)
  const plankPayload = {
    userId: user.id,
    userName: user.name,
    dayNumber: 5,
    exercise: 'Forearm Plank',
    setNumber: 1,
    reps: 0,
    durationSeconds: 45,
    formScore: 92,
    mistakes: ['Hips sagged slightly at 35s'],
    restSeconds: 45,
    mode: 'live_camera',
  };

  const plankRes = await fetch(`${BASE_URL}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plankPayload),
  });
  if (!plankRes.ok) throw new Error(`Failed to log plank: ${await plankRes.text()}`);
  const plankData = await plankRes.json();
  console.log('✓ Plank logged successfully:', plankData.log.exercise, 'durationSeconds:', plankData.log.durationSeconds);

  // 4. Verify GET /api/logs returns the logs with durationSeconds
  const getLogsRes = await fetch(`${BASE_URL}/api/logs`);
  if (!getLogsRes.ok) throw new Error('Failed to GET /api/logs');
  const getLogsData = await getLogsRes.json();
  const foundPlank = getLogsData.logs.find((l) => l.exercise === 'Forearm Plank' && l.id === plankData.log.id);
  if (!foundPlank || foundPlank.durationSeconds !== 45) {
    throw new Error(`Plank log durationSeconds mismatch: expected 45, got ${foundPlank?.durationSeconds}`);
  }
  console.log('✓ GET /api/logs returned plank with durationSeconds = 45');

  // 5. Verify JSON export
  const jsonExportRes = await fetch(`${BASE_URL}/api/logs?format=json`);
  if (!jsonExportRes.ok) throw new Error('Failed to export JSON');
  const jsonExport = await jsonExportRes.json();
  const logsArray = Array.isArray(jsonExport) ? jsonExport : jsonExport.logs;
  const exportedPlank = logsArray.find((l) => l.exercise === 'Forearm Plank' && l.id === plankData.log.id);
  if (!exportedPlank || exportedPlank.durationSeconds !== 45) {
    throw new Error('Exported JSON did not match expected durationSeconds');
  }
  console.log('✓ JSON export contains durationSeconds field and matches');

  // 6. Verify CSV export
  const csvExportRes = await fetch(`${BASE_URL}/api/logs?format=csv`);
  if (!csvExportRes.ok) throw new Error('Failed to export CSV');
  const csvText = await csvExportRes.text();
  if (!csvText.includes('Duration (s)') || !csvText.includes('Forearm Plank') || !csvText.includes('45')) {
    throw new Error('CSV export missing durationSeconds column or plank data');
  }
  console.log('✓ CSV export contains "Duration (s)" header and plank 45s hold');

  // 7. Verify data/workout_logs.json file synchronization
  const fs = await import('fs');
  const fileContent = fs.readFileSync('data/workout_logs.json', 'utf8');
  const parsedFile = JSON.parse(fileContent);
  const filePlank = parsedFile.find((l) => l.exercise === 'Forearm Plank' && l.id === plankData.log.id);
  if (!filePlank || filePlank.durationSeconds !== 45) {
    throw new Error('data/workout_logs.json missing durationSeconds = 45 for logged plank');
  }
  console.log('✓ data/workout_logs.json is synchronized with durationSeconds = 45');

  console.log('\nAll Step 3B-2 verification checks PASSED successfully!');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
