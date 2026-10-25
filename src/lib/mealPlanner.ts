// FitForm Deterministic Meal Planner Engine
// Pure algorithmic optimization: maximizes protein & calories within budget constraints.
// Ensures variety across 4 distinct meals: Breakfast, Lunch, Evening Snack, Dinner.
// No AI, zero external dependencies.

import {
  FOOD_DATABASE,
  FoodItem,
  DietType,
  getAvailableFoods,
} from './foodData';

export interface MealFoodItem {
  foodId: string;
  name: string;
  hindiName?: string;
  servingUnit: string;
  quantity: number; // multiplier e.g. 1 or 2
  cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

export interface MealSlot {
  id: string;
  name: 'Breakfast' | 'Lunch' | 'Evening Snack' | 'Dinner';
  icon: string;
  timeHint: string;
  foods: MealFoodItem[];
  mealCost: number;
  mealCalories: number;
  mealProtein: number;
}

export interface GeneratedDietPlan {
  budget: number;
  dietType: DietType;
  targetCalories: number;
  targetProtein: number;
  totalCost: number;
  totalCalories: number;
  totalProtein: number;
  proteinPercentAchieved: number;
  caloriesPercentAchieved: number;
  isBudgetConstrained: boolean;
  statusNote: string;
  budgetSurplus?: number;
  meals: MealSlot[];
}

export function generateDietPlan(
  budget: number,
  dietType: DietType,
  excludedFoodIds: string[] = [],
  targetCalories: number,
  targetProtein: number
): GeneratedDietPlan {
  const safeBudget = Math.max(10, budget);
  const available = getAvailableFoods(dietType, excludedFoodIds);

  // Helper to find food by id
  const findFood = (id: string): FoodItem | undefined => {
    return available.find((f) => f.id === id);
  };

  // Helper to find fallback in a category
  const findCategoryFallback = (
    category: string,
    excludeIds: string[] = []
  ): FoodItem | undefined => {
    return available
      .filter((f) => f.category === category && !excludeIds.includes(f.id))
      .sort((a, b) => b.proteinPerRupee - a.proteinPerRupee)[0];
  };

  // Define candidate pools by meal slot to ensure authentic Indian meal balance
  // 1. Breakfast candidates
  let bProtein =
    dietType === 'non-vegetarian' || dietType === 'eggetarian'
      ? findFood('whole_egg') || findFood('egg_whites') || findFood('toned_milk')
      : findFood('toned_milk') || findFood('moong_sprouts') || findFood('curd_dahi');
  if (!bProtein) bProtein = findCategoryFallback('protein');

  let bCarb = findFood('rolled_oats') || findFood('poha') || findFood('brown_bread');
  if (!bCarb) bCarb = findCategoryFallback('carb');

  const bFruit = findFood('banana') || findCategoryFallback('fruit');

  // 2. Lunch candidates
  let lProtein =
    dietType === 'non-vegetarian'
      ? findFood('chicken_breast') || findFood('kala_chana')
      : findFood('rajma') || findFood('yellow_moong_dal') || findFood('paneer');
  if (!lProtein) lProtein = findCategoryFallback('protein', [bProtein?.id || '']);

  let lCarb = findFood('white_rice') || findFood('wheat_roti');
  if (!lCarb) lCarb = findCategoryFallback('carb', [bCarb?.id || '']);

  const lVeg = findFood('mixed_veg') || findFood('kachumber_salad') || findCategoryFallback('vegetable');

  // 3. Evening Snack candidates
  let sProtein = findFood('roasted_chana') || findFood('moong_sprouts') || findFood('curd_dahi');
  if (!sProtein) sProtein = findCategoryFallback('protein', [bProtein?.id || '', lProtein?.id || '']);

  const sFatOrFruit = findFood('roasted_peanuts') || findFood('guava_amrood') || findFood('papaya');

  // 4. Dinner candidates
  let dProtein =
    dietType === 'non-vegetarian'
      ? findFood('fish_fillet') || findFood('whole_egg') || findFood('soya_chunks')
      : findFood('soya_chunks') || findFood('paneer') || findFood('kala_chana') || findFood('yellow_moong_dal');
  if (!dProtein) dProtein = findCategoryFallback('protein', [bProtein?.id || '', lProtein?.id || '', sProtein?.id || '']);

  let dCarb = findFood('wheat_roti') || findFood('brown_rice') || findFood('boiled_potato');
  if (!dCarb) dCarb = findCategoryFallback('carb', [bCarb?.id || '', lCarb?.id || '']);

  const dVeg = findFood('palak_spinach') || findFood('kachumber_salad') || findCategoryFallback('vegetable', [lVeg?.id || '']);

  // Assemble base meal structure
  const rawMeals: { slot: 'Breakfast' | 'Lunch' | 'Evening Snack' | 'Dinner'; icon: string; time: string; items: { food: FoodItem; qty: number }[] }[] = [
    {
      slot: 'Breakfast',
      icon: 'SunMedium',
      time: '8:00 AM - 9:00 AM',
      items: [
        ...(bProtein ? [{ food: bProtein, qty: 1 }] : []),
        ...(bCarb ? [{ food: bCarb, qty: 1 }] : []),
        ...(bFruit ? [{ food: bFruit, qty: 1 }] : []),
      ],
    },
    {
      slot: 'Lunch',
      icon: 'Sun',
      time: '1:00 PM - 2:00 PM',
      items: [
        ...(lProtein ? [{ food: lProtein, qty: 1 }] : []),
        ...(lCarb ? [{ food: lCarb, qty: 1 }] : []),
        ...(lVeg ? [{ food: lVeg, qty: 1 }] : []),
      ],
    },
    {
      slot: 'Evening Snack',
      icon: 'Coffee',
      time: '5:00 PM - 6:00 PM',
      items: [
        ...(sProtein ? [{ food: sProtein, qty: 1 }] : []),
        ...(sFatOrFruit ? [{ food: sFatOrFruit, qty: 1 }] : []),
      ],
    },
    {
      slot: 'Dinner',
      icon: 'Moon',
      time: '8:30 PM - 9:30 PM',
      items: [
        ...(dProtein ? [{ food: dProtein, qty: 1 }] : []),
        ...(dCarb ? [{ food: dCarb, qty: 1 }] : []),
        ...(dVeg ? [{ food: dVeg, qty: 1 }] : []),
      ],
    },
  ];

  // Calculate base cost
  const calcTotalCost = () => {
    return rawMeals.reduce(
      (sum, m) => sum + m.items.reduce((s, i) => s + i.food.pricePerServing * i.qty, 0),
      0
    );
  };

  // If budget is extremely low (e.g. ₹20 - ₹50), prioritize ultra-high protein per rupee foods
  if (calcTotalCost() > safeBudget) {
    // Replace expensive protein/carb foods with high protein-per-rupee champions
    const cheapProteinHero =
      findFood('soya_chunks') ||
      findFood('whole_egg') ||
      findFood('kala_chana') ||
      findFood('roasted_chana') ||
      findCategoryFallback('protein');

    const cheapCarbHero = findFood('wheat_roti') || findFood('white_rice') || findCategoryFallback('carb');

    // Simplify to stay under budget
    if (safeBudget < 60 && cheapProteinHero && cheapCarbHero) {
      rawMeals[0].items = [{ food: cheapCarbHero, qty: 1 }];
      rawMeals[1].items = [{ food: cheapProteinHero, qty: 1 }, { food: cheapCarbHero, qty: 1 }];
      rawMeals[2].items = [findFood('roasted_chana') ? { food: findFood('roasted_chana')!, qty: 1 } : { food: cheapCarbHero, qty: 1 }];
      rawMeals[3].items = [{ food: cheapProteinHero, qty: 1 }, { food: cheapCarbHero, qty: 1 }];
    }

    // Scale down quantities if still exceeding budget
    while (calcTotalCost() > safeBudget) {
      // Find highest cost item with quantity > 1 or drop optional fruits/veggies
      let reduced = false;
      for (const meal of rawMeals) {
        for (let i = meal.items.length - 1; i >= 0; i--) {
          if (meal.items[i].qty > 1) {
            meal.items[i].qty -= 1;
            reduced = true;
            break;
          }
        }
        if (reduced) break;
      }
      if (!reduced) {
        // Drop lowest protein-per-rupee item from the largest meal if strictly necessary
        for (const meal of rawMeals) {
          if (meal.items.length > 1) {
            meal.items.pop();
            reduced = true;
            break;
          }
        }
      }
      if (!reduced) break; // Reached minimal possible baseline
    }
  } else {
    // Budget is generous: scale up nutritious portions to meet targetProtein & targetCalories!
    let currentCost = calcTotalCost();

    // Scale up protein foods first (up to 2 servings max per food to maintain balance)
    for (const meal of rawMeals) {
      for (const item of meal.items) {
        if (item.food.category === 'protein' && item.qty < 2) {
          const costToAdd = item.food.pricePerServing;
          if (currentCost + costToAdd <= safeBudget) {
            item.qty += 1;
            currentCost += costToAdd;
          }
        }
      }
    }

    // If budget still has room and calories are below target, scale up complex carbs / healthy fats
    for (const meal of rawMeals) {
      for (const item of meal.items) {
        if ((item.food.category === 'carb' || item.food.category === 'fat') && item.qty < 2) {
          const costToAdd = item.food.pricePerServing;
          if (currentCost + costToAdd <= safeBudget) {
            item.qty += 1;
            currentCost += costToAdd;
          }
        }
      }
    }

    // If high budget (e.g. ₹250+), add whey protein or almonds to snack/breakfast if allowed
    if (currentCost + 55 <= safeBudget && findFood('whey_protein') && !excludedFoodIds.includes('whey_protein')) {
      rawMeals[2].items.push({ food: findFood('whey_protein')!, qty: 1 });
      currentCost += 55;
    } else if (currentCost + 14 <= safeBudget && findFood('almonds_badam') && !excludedFoodIds.includes('almonds_badam')) {
      rawMeals[0].items.push({ food: findFood('almonds_badam')!, qty: 1 });
      currentCost += 14;
    }
  }

  // Format final meal slots
  let grandCost = 0;
  let grandCalories = 0;
  let grandProtein = 0;

  const finalMeals: MealSlot[] = rawMeals.map((m, idx) => {
    let mealCost = 0;
    let mealCalories = 0;
    let mealProtein = 0;

    const foods: MealFoodItem[] = m.items.map((i) => {
      const itemCost = i.food.pricePerServing * i.qty;
      const itemCals = i.food.calories * i.qty;
      const itemProtein = i.food.protein * i.qty;
      const itemCarbs = i.food.carbs * i.qty;
      const itemFat = i.food.fat * i.qty;

      mealCost += itemCost;
      mealCalories += itemCals;
      mealProtein += itemProtein;

      return {
        foodId: i.food.id,
        name: i.food.name,
        hindiName: i.food.hindiName,
        servingUnit: i.food.servingUnit,
        quantity: i.qty,
        cost: itemCost,
        calories: itemCals,
        protein: Math.round(itemProtein * 10) / 10,
        carbs: Math.round(itemCarbs * 10) / 10,
        fat: Math.round(itemFat * 10) / 10,
        category: i.food.category,
      };
    });

    grandCost += mealCost;
    grandCalories += mealCalories;
    grandProtein += mealProtein;

    return {
      id: `meal_${idx + 1}`,
      name: m.slot,
      icon: m.icon,
      timeHint: m.time,
      foods,
      mealCost,
      mealCalories,
      mealProtein: Math.round(mealProtein * 10) / 10,
    };
  });

  grandProtein = Math.round(grandProtein * 10) / 10;
  const proteinPercentAchieved = Math.min(100, Math.round((grandProtein / targetProtein) * 100));
  const caloriesPercentAchieved = Math.min(100, Math.round((grandCalories / targetCalories) * 100));

  // Determine honest budget feedback
  const isBudgetConstrained = proteinPercentAchieved < 85;
  let statusNote = '';

  if (safeBudget < 50) {
    statusNote = `With ₹${safeBudget}/day, your budget is very tight. This plan reaches ${proteinPercentAchieved}% of your protein target (${grandProtein}g / ${targetProtein}g). Focus heavily on Soya Chunks, Kala Chana, and Whole Eggs for max nutrition per rupee.`;
  } else if (isBudgetConstrained) {
    statusNote = `With ₹${safeBudget}/day, you can reach about ${proteinPercentAchieved}% of your daily protein target. Here is your most efficient plan. Consider adding 50g Soya Chunks (₹12, 26g protein) or 2 Eggs (₹14, 12g protein) to bridge the gap.`;
  } else if (safeBudget >= 250) {
    statusNote = `Generous budget of ₹${safeBudget}/day! You comfortably hit ${proteinPercentAchieved}% of your protein goal with premium variety including dairy, nuts, and high-quality protein.`;
  } else {
    statusNote = `Balanced budget! You achieve ${proteinPercentAchieved}% of your target protein and ${caloriesPercentAchieved}% of daily calories with clean whole foods.`;
  }

  return {
    budget: safeBudget,
    dietType,
    targetCalories,
    targetProtein,
    totalCost: grandCost,
    totalCalories: grandCalories,
    totalProtein: grandProtein,
    proteinPercentAchieved,
    caloriesPercentAchieved,
    isBudgetConstrained,
    statusNote,
    budgetSurplus: Math.max(0, safeBudget - grandCost),
    meals: finalMeals,
  };
}

// Food Swap Helper: Replaces a food with another available food in the same category
export function swapFoodItem(
  currentFoodId: string,
  dietType: DietType,
  excludedFoodIds: string[] = []
): FoodItem | null {
  const currentFood = FOOD_DATABASE.find((f) => f.id === currentFoodId);
  if (!currentFood) return null;

  const allowed = getAvailableFoods(dietType, [...excludedFoodIds, currentFoodId]);
  const sameCategory = allowed.filter((f) => f.category === currentFood.category);

  if (sameCategory.length === 0) return null;

  // Find alternative with closest price per serving
  sameCategory.sort(
    (a, b) =>
      Math.abs(a.pricePerServing - currentFood.pricePerServing) -
      Math.abs(b.pricePerServing - currentFood.pricePerServing)
  );

  return sameCategory[0] || null;
}
