// scripts/test_user1_timeline.js
async function testTimeline() {
  const baseUrl = 'http://localhost:3000';
  const planRes = await fetch(`${baseUrl}/api/plan?userId=1`);
  const data = await planRes.json();
  const days = data.days || [];
  const completed = days.filter(d => d.status === 'completed');
  const upNext = days.find(d => !d.isRest && d.status !== 'completed');

  console.log(`User 1 (${data.user.name}) total days: ${days.length}`);
  console.log(`Completed days: ${completed.map(d => `Day ${d.dayNumber} (${d.workoutType})`).join(', ')}`);
  console.log(`Up next day: Day ${upNext.dayNumber} (${upNext.workoutType})`);
  console.log(`Rest days sample: Day 7 (${days[6].workoutType}, isRest: ${days[6].isRest})`);

  // Verify Diet JSON for User 1
  const dietRes = await fetch(`${baseUrl}/api/diet?userId=1&format=json`);
  const dietData = await dietRes.json();
  console.log(`User 1 Diet JSON Export Header: ${dietRes.headers.get('content-disposition')}`);
  console.log(`User 1 Diet JSON has current plan: ${!!dietData.currentPlan}, History count: ${dietData.historyCount}`);
}

testTimeline().catch(console.error);
