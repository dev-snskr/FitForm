// FitForm Nutrition Calculator
// Strictly applies the scientifically validated Mifflin-St Jeor equation,
// calculates TDEE with weekly exercise multipliers, and computes goal-specific macro targets.

export interface UserMetrics {
  age: number;
  gender: string; // 'male' | 'female' | 'other'
  heightCm: number;
  weightKg: number;
  goal: string; // 'fat_loss' | 'muscle_gain' | 'maintain'
  daysPerWeek: number; // 3 - 6
}
//hsdduiityfgjidugu eyf uiuygtweef && whddhg jdb *huh jjsi ll : ppo s ti chi {bsqjh}
export interface NutritionTargets {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  explanation: {
    bmrText: string;
    tdeeText: string;
    goalText: string;
    proteinText: string;
    macroBreakdownText: string;
  };
}

export function calculateNutritionTargets(metrics: UserMetrics): NutritionTargets {
  const { age, gender, heightCm, weightKg, goal, daysPerWeek } = metrics;
  const normalizedGender = gender.toLowerCase();
  const normalizedGoal = goal.toLowerCase();

  // 1. Basal Metabolic Rate (BMR) via Mifflin-St Jeor equation
  let bmr: number;
  if (normalizedGender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (normalizedGender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // For other / unspecified, take the respectful average of male and female formula
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }
  bmr = Math.round(bmr);

  // 2. Activity Multiplier based on workout days per week
  let activityMultiplier = 1.375; // 3 days default: lightly active
  if (daysPerWeek >= 6) {
    activityMultiplier = 1.725; // 6 days: heavily active
  } else if (daysPerWeek >= 4) {
    activityMultiplier = 1.55; // 4-5 days: moderately active
  }

  // Total Daily Energy Expenditure (Maintenance Calories)
  const tdee = Math.round(bmr * activityMultiplier);

  // 3. Goal Adjustment
  let calorieAdjustment = 0;
  if (normalizedGoal === 'fat_loss') {
    calorieAdjustment = -400; // Caloric deficit for steady fat reduction
  } else if (normalizedGoal === 'muscle_gain') {
    calorieAdjustment = 300; // Caloric surplus for lean hypertrophy
  } else {
    calorieAdjustment = 0; // Maintenance
  }

  let targetCalories = tdee + calorieAdjustment;

  // Safety floor: Never dip dangerously low
  const safetyFloor = normalizedGender === 'female' ? 1200 : 1500;
  if (targetCalories < safetyFloor) {
    targetCalories = safetyFloor;
  }

  // 4. Macro targets
  // Protein multiplier based on goal
  let proteinPerKg = 1.5;
  if (normalizedGoal === 'muscle_gain') {
    proteinPerKg = 2.0; // High protein to support muscle synthesis
  } else if (normalizedGoal === 'fat_loss') {
    proteinPerKg = 1.8; // High protein to spare lean tissue in deficit
  }
  const proteinGrams = Math.round(weightKg * proteinPerKg);

  // Fat target: ~25% of total caloric intake (9 kcal per gram of fat)
  const fatGrams = Math.round((targetCalories * 0.25) / 9);

  // Carbs target: Remaining calories (4 kcal per gram of carb & protein)
  const caloriesFromProteinAndFat = proteinGrams * 4 + fatGrams * 9;
  const remainingCaloriesForCarbs = Math.max(0, targetCalories - caloriesFromProteinAndFat);
  const carbsGrams = Math.round(remainingCaloriesForCarbs / 4);

  // Plain-language explanations
  const goalNames: Record<string, string> = {
    fat_loss: 'Fat Loss (400 kcal deficit)',
    muscle_gain: 'Muscle Gain (300 kcal lean surplus)',
    maintain: 'Maintain Weight (balance)',
  };

  const explanation = {
    bmrText: `Your Basal Metabolic Rate (BMR) is ~${bmr} kcal/day. This is the minimum energy your organs burn just staying alive at complete rest.`,
    tdeeText: `With ${daysPerWeek} training days/week, your total daily burn (TDEE) is ~${tdee} kcal/day.`,
    goalText: `For ${goalNames[normalizedGoal] || 'Maintenance'}, your optimal intake is ${targetCalories} kcal/day.`,
    proteinText: `Targeting ${proteinGrams}g of protein (~${proteinPerKg}g per kg of bodyweight) ensures muscle preservation and repair.`,
    macroBreakdownText: `Carbohydrates provide fuel for workouts (~${carbsGrams}g), while healthy fats support hormone production (~${fatGrams}g).`,
  };

  return {
    bmr,
    tdee,
    activityMultiplier,
    targetCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    explanation,
  };
}
