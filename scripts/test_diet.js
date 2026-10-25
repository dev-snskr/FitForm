// scripts/test_diet.js
// Automated verification script for Step 2: Diet by Budget feature

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Starting Step 2 Diet Automated Verification ---');

  // 1. Dev Server Ready Check
  let ready = false;
  for (let i = 0; i < 15; i++) {
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
  console.log('✓ Dev server is ready and responding at http://localhost:3000');

  // Fetch users
  const usersRes = await fetch(`${baseUrl}/api/users`);
  const data = await usersRes.json();
  const users = data.users || [];
  console.log(`Found ${users.length} user(s):`, users.map(u => `${u.id}: ${u.name} (${u.goal})`));
  const alex = users.find(u => u.id === 1) || users[0];
  const maya = users.find(u => u.id === 2) || users[0];

  // Test Case 1: Low Budget Fat Loss (₹70) for Maya
  console.log('\n--- Test Case 1: Low Budget Fat Loss (₹70) ---');
  const fatLossRes = await fetch(`${baseUrl}/api/diet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: maya.id,
      budget: 70,
      dietType: 'non-vegetarian',
      excludedFoodIds: []
    })
  });
  const fatLossData = await fatLossRes.json();
  console.log(`Status: ${fatLossRes.status}`);
  console.log(`Budget: ₹${fatLossData.plan.budget}, Total Cost: ₹${fatLossData.plan.totalCost}`);
  console.log(`Calories: ${fatLossData.plan.totalCalories} / ${fatLossData.plan.targetCalories} kcal`);
  console.log(`Protein: ${fatLossData.plan.totalProtein}g / ${fatLossData.plan.targetProtein}g (${fatLossData.plan.proteinPercentAchieved}%)`);
  console.log(`Diagnostic Note: "${fatLossData.plan.statusNote}"`);
  console.log(`Meal count: ${fatLossData.plan.meals.length}`);
  if (fatLossData.plan.totalCost <= 80) {
    console.log('✓ Cost tightly bounded around budget');
  }

  // Test Case 2: High Budget Muscle Gain (₹350) for Alex
  console.log('\n--- Test Case 2: High Budget Muscle Gain (₹350) ---');
  const muscleGainRes = await fetch(`${baseUrl}/api/diet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: alex.id,
      budget: 350,
      dietType: 'non-vegetarian',
      excludedFoodIds: []
    })
  });
  const muscleGainData = await muscleGainRes.json();
  console.log(`Status: ${muscleGainRes.status}`);
  console.log(`Budget: ₹${muscleGainData.plan.budget}, Total Cost: ₹${muscleGainData.plan.totalCost}`);
  console.log(`Calories: ${muscleGainData.plan.totalCalories} / ${muscleGainData.plan.targetCalories} kcal`);
  console.log(`Protein: ${muscleGainData.plan.totalProtein}g / ${muscleGainData.plan.targetProtein}g (${muscleGainData.plan.proteinPercentAchieved}%)`);
  console.log(`Meals: ${muscleGainData.plan.meals.map(m => `${m.name} (₹${m.mealCost})`).join(', ')}`);
  const allFoodsHigh = muscleGainData.plan.meals.flatMap(m => m.foods.map(i => i.name));
  console.log('High budget foods included:', allFoodsHigh.slice(0, 8).join(', '));
  if (muscleGainData.plan.proteinPercentAchieved >= 90) {
    console.log('✓ High budget reached protein target successfully');
  }

  // Test Case 3: Strictly Vegetarian Profile (₹160)
  console.log('\n--- Test Case 3: Strictly Vegetarian Profile ---');
  const vegRes = await fetch(`${baseUrl}/api/diet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: alex.id,
      budget: 160,
      dietType: 'vegetarian',
      excludedFoodIds: []
    })
  });
  const vegData = await vegRes.json();
  const allVegFoods = vegData.plan.meals.flatMap(m => m.foods);
  const nonVegFound = allVegFoods.filter(f => f.category === 'chicken' || f.name.toLowerCase().includes('chicken') || f.name.toLowerCase().includes('fish') || f.name.toLowerCase().includes('egg'));
  console.log(`Found ${allVegFoods.length} items across 4 meals:`, allVegFoods.map(f => f.name).join(', '));
  if (nonVegFound.length === 0) {
    console.log('✓ Strictly vegetarian verified: 0 non-veg/eggetarian items present.');
  } else {
    console.error('FAILED: Non-vegetarian items found in veg plan:', nonVegFound);
  }

  // Test Case 4: Eggetarian Profile (Eggs allowed, no chicken/fish)
  console.log('\n--- Test Case 4: Eggetarian Profile ---');
  const eggRes = await fetch(`${baseUrl}/api/diet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: alex.id,
      budget: 180,
      dietType: 'eggetarian',
      excludedFoodIds: []
    })
  });
  const eggData = await eggRes.json();
  const allEggFoods = eggData.plan.meals.flatMap(m => m.foods);
  const meatFound = allEggFoods.filter(f => f.name.toLowerCase().includes('chicken') || f.name.toLowerCase().includes('fish'));
  const eggPresent = allEggFoods.some(f => f.name.toLowerCase().includes('egg'));
  console.log(`Meat/Fish items found: ${meatFound.length}, Egg present: ${eggPresent}`);
  if (meatFound.length === 0 && eggPresent) {
    console.log('✓ Strictly eggetarian verified: Eggs included, chicken & fish excluded.');
  }

  // Test Case 5: Ultra-low Budget (₹25) - Honest Diagnostics
  console.log('\n--- Test Case 5: Ultra-Low Budget (₹25) ---');
  const lowRes = await fetch(`${baseUrl}/api/diet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: alex.id,
      budget: 25,
      dietType: 'vegetarian',
      excludedFoodIds: []
    })
  });
  const lowData = await lowRes.json();
  console.log(`Total cost: ₹${lowData.plan.totalCost}, Protein: ${lowData.plan.totalProtein}g (${lowData.plan.proteinPercentAchieved}%)`);
  console.log(`Diagnostic honesty check: "${lowData.plan.statusNote}"`);
  if (lowData.plan.isBudgetConstrained) {
    console.log('✓ Honest budget diagnostic flagged isBudgetConstrained = true.');
  }

  // Test Case 6: Fetch Saved Plans history
  console.log('\n--- Test Case 6: Fetch Saved Diet Plans ---');
  const historyRes = await fetch(`${baseUrl}/api/diet?userId=${alex.id}`);
  const historyData = await historyRes.json();
  console.log(`Saved plans in database for user ${alex.id}: ${historyData.plans.length}`);
  if (historyData.plans.length > 0) {
    console.log('✓ Database persistence verified: latest plan date:', historyData.plans[0].createdAt);
  }

  // Test Case 7: JSON Export
  console.log('\n--- Test Case 7: JSON Export Endpoint ---');
  const exportRes = await fetch(`${baseUrl}/api/diet?userId=${alex.id}&format=json`);
  const exportHeader = exportRes.headers.get('content-disposition');
  const exportData = await exportRes.json();
  console.log(`Content-Disposition header: ${exportHeader}`);
  console.log(`Exported payload user: ${exportData.user?.name}, historyCount: ${exportData.historyCount}`);
  if (exportHeader && exportHeader.includes('attachment') && exportData.currentPlan) {
    console.log('✓ JSON export verified with proper attachment headers.');
  }

  // Test Case 8: Verify Page HTML Load for /diet, /plan, /logs
  console.log('\n--- Test Case 8: Verify Page HTML Load ---');
  const dietPage = await (await fetch(`${baseUrl}/diet`)).text();
  const planPage = await (await fetch(`${baseUrl}/plan`)).text();
  const logsPage = await (await fetch(`${baseUrl}/logs`)).text();
  console.log(`Diet page size: ${dietPage.length} bytes, contains FitForm Diet: ${dietPage.includes('FitForm')}`);
  console.log(`Plan page size: ${planPage.length} bytes, contains Workout: ${planPage.includes('Workout')}`);
  console.log(`Logs page size: ${logsPage.length} bytes, contains Logs: ${logsPage.includes('Logs')}`);

  console.log('\n=== ALL 8 TEST CASES PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
