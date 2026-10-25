'use client';

// FitForm Diet by Budget Page (/diet)
// Step 2 Core Feature:
// - Science-backed nutrition calculation (Mifflin-St Jeor BMR, TDEE, protein & calorie targets).
// - Budget slider & numeric input with instant feedback.
// - Diet type selection (Vegetarian / Eggetarian / Non-Vegetarian) and food exclusion filters.
// - Deterministic Indian meal planning across Breakfast, Lunch, Snack, and Dinner.
// - Summary card comparing total cost vs budget, calories vs target, and protein vs target.
// - Honest budget constraint diagnostics & Top Cheapest Protein Sources ranking.
// - Interactive "Swap" button on every food item.
// - Previous plans history list & JSON export.
// - High-contrast Light & Dark mode support with Framer Motion animations.

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  DollarSign,
  Flame,
  Award,
  RefreshCw,
  FileJson,
  AlertCircle,
  Info,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  ShieldAlert,
  Loader2,
  SunMedium,
  Sun,
  Coffee,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getStoredActiveUserId } from '@/lib/profileStorage';
import { FOOD_DATABASE, getTopCheapestProteins, DietType } from '@/lib/foodData';
import { NutritionTargets } from '@/lib/nutrition';
import { MealSlot, GeneratedDietPlan, swapFoodItem } from '@/lib/mealPlanner';

interface SavedPlanSummary {
  id: number;
  budget: number;
  dietType: string;
  totalCost: number;
  totalCalories: number;
  totalProtein: number;
  createdAt: string;
  meals: MealSlot[];
}

export default function DietPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Active User Profile
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  // Form Inputs
  const [budget, setBudget] = useState<number>(150);
  const [dietType, setDietType] = useState<DietType>('vegetarian');
  const [excludedFoods, setExcludedFoods] = useState<string[]>([]);
  const [isExclusionOpen, setIsExclusionOpen] = useState<boolean>(false);

  // Nutrition & Meal Plan State
  const [nutrition, setNutrition] = useState<NutritionTargets | null>(null);
  const [dietPlan, setDietPlan] = useState<GeneratedDietPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previousPlans, setPreviousPlans] = useState<SavedPlanSummary[]>([]);
  const [swapFeedback, setSwapFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Meal slot icons map
  const mealIcons: Record<string, React.ReactNode> = {
    Breakfast: <SunMedium className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
    Lunch: <Sun className="w-5 h-5 text-orange-500 dark:text-orange-400" />,
    'Evening Snack': <Coffee className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
    Dinner: <Moon className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
  };

  const fetchPreviousPlans = useCallback(async (uid: number) => {
    try {
      const res = await fetch(`/api/diet?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setPreviousPlans(data.plans || []);
        if (data.latestPlan && !dietPlan) {
          // Show latest plan initially if available
          setDietPlan({
            budget: data.latestPlan.budget,
            dietType: data.latestPlan.dietType,
            targetCalories: data.latestPlan.targetCalories,
            targetProtein: data.latestPlan.targetProtein,
            totalCost: data.latestPlan.totalCost,
            totalCalories: data.latestPlan.totalCalories,
            totalProtein: data.latestPlan.totalProtein,
            proteinPercentAchieved: Math.min(100, Math.round((data.latestPlan.totalProtein / data.latestPlan.targetProtein) * 100)),
            caloriesPercentAchieved: Math.min(100, Math.round((data.latestPlan.totalCalories / data.latestPlan.targetCalories) * 100)),
            isBudgetConstrained: (data.latestPlan.totalProtein / data.latestPlan.targetProtein) < 0.85,
            statusNote: `Loaded saved plan from ${new Date(data.latestPlan.createdAt).toLocaleDateString()}.`,
            meals: data.latestPlan.meals,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch previous diet plans:', err);
    }
  }, [dietPlan]);

  // Load User & Saved Preferences
  useEffect(() => {
    async function initUser() {
      setIsLoadingUser(true);
      try {
        let activeId = getStoredActiveUserId();
        if (!activeId) {
          const res = await fetch('/api/users');
          if (res.ok) {
            const data = await res.json();
            if (data.users && data.users.length > 0) {
              activeId = data.users[0].id;
            }
          }
        }

        if (!activeId) {
          router.replace('/onboarding');
          return;
        }

        setUserId(activeId);

        // Fetch user metrics for greeting
        const userRes = await fetch(`/api/users?id=${activeId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setUserName(userData.user.name);
          }
        }

        // Restore remembered preferences per profile from localStorage
        const storedPrefKey = `fitform_diet_pref_${activeId}`;
        const storedPref = localStorage.getItem(storedPrefKey);
        if (storedPref) {
          try {
            const parsed = JSON.parse(storedPref);
            if (parsed.budget) setBudget(Number(parsed.budget));
            if (parsed.dietType) setDietType(parsed.dietType);
            if (parsed.excludedFoods) setExcludedFoods(parsed.excludedFoods);
          } catch {
            // Ignore corrupted local preference
          }
        }

        // Fetch previous saved diet plans for this user
        fetchPreviousPlans(activeId);
      } catch (err) {
        console.error('Failed to initialize diet user:', err);
      } finally {
        setIsLoadingUser(false);
      }
    }

    initUser();
  }, [router, fetchPreviousPlans]);

  // Generate Diet Handler
  const handleGenerateDiet = async () => {
    if (!userId) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setSwapFeedback(null);

    // Save choices to localStorage for this profile
    const prefKey = `fitform_diet_pref_${userId}`;
    localStorage.setItem(
      prefKey,
      JSON.stringify({ budget, dietType, excludedFoods })
    );

    try {
      const res = await fetch('/api/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          budget: Number(budget),
          dietType,
          excludedFoodIds: excludedFoods,
          savePlan: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate diet plan');
      }

      const data = await res.json();
      setNutrition(data.nutrition);
      setDietPlan(data.plan);

      // Refresh previous plans history
      fetchPreviousPlans(userId);
    } catch (err: unknown) {
      console.error('Diet generation error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not generate diet. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Food Swap Handler
  const handleSwap = (mealId: string, currentFoodId: string, currentFoodName: string) => {
    if (!dietPlan) return;

    const replacement = swapFoodItem(currentFoodId, dietType, excludedFoods);
    if (!replacement) {
      setSwapFeedback(`No alternative found in the same category for ${currentFoodName}. Try removing exclusions.`);
      setTimeout(() => setSwapFeedback(null), 4000);
      return;
    }

    // Apply replacement to the specific meal slot
    const updatedMeals = dietPlan.meals.map((meal) => {
      if (meal.id !== mealId) return meal;

      const updatedFoods = meal.foods.map((foodItem) => {
        if (foodItem.foodId !== currentFoodId) return foodItem;

        return {
          foodId: replacement.id,
          name: replacement.name,
          hindiName: replacement.hindiName,
          servingUnit: replacement.servingUnit,
          quantity: foodItem.quantity,
          cost: replacement.pricePerServing * foodItem.quantity,
          calories: replacement.calories * foodItem.quantity,
          protein: Math.round(replacement.protein * foodItem.quantity * 10) / 10,
          carbs: Math.round(replacement.carbs * foodItem.quantity * 10) / 10,
          fat: Math.round(replacement.fat * foodItem.quantity * 10) / 10,
          category: replacement.category,
        };
      });

      const mealCost = updatedFoods.reduce((sum, f) => sum + f.cost, 0);
      const mealCalories = updatedFoods.reduce((sum, f) => sum + f.calories, 0);
      const mealProtein = Math.round(updatedFoods.reduce((sum, f) => sum + f.protein, 0) * 10) / 10;

      return {
        ...meal,
        foods: updatedFoods,
        mealCost,
        mealCalories,
        mealProtein,
      };
    });

    const grandCost = updatedMeals.reduce((sum, m) => sum + m.mealCost, 0);
    const grandCalories = updatedMeals.reduce((sum, m) => sum + m.mealCalories, 0);
    const grandProtein = Math.round(updatedMeals.reduce((sum, m) => sum + m.mealProtein, 0) * 10) / 10;
    const proteinPercent = Math.min(100, Math.round((grandProtein / dietPlan.targetProtein) * 100));
    const caloriesPercent = Math.min(100, Math.round((grandCalories / dietPlan.targetCalories) * 100));

    setDietPlan({
      ...dietPlan,
      meals: updatedMeals,
      totalCost: grandCost,
      totalCalories: grandCalories,
      totalProtein: grandProtein,
      proteinPercentAchieved: proteinPercent,
      caloriesPercentAchieved: caloriesPercent,
    });

    setSwapFeedback(`Swapped "${currentFoodName}" with "${replacement.name}"!`);
    setTimeout(() => setSwapFeedback(null), 3500);
  };

  const handleExportJson = () => {
    if (!userId) return;
    window.location.href = `/api/diet?userId=${userId}&format=json`;
  };

  const topCheapestProteins = getTopCheapestProteins(dietType, 5);

  if (isLoadingUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Loading Diet Engine...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <Utensils className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Nutrition Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Budget-Tailored Diet Plans
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Personalized for {userName || 'you'} • High-protein Indian foods balanced to your exact daily rupee budget.
            </p>
          </div>

          {/* Header Action: Export JSON */}
          <div className="flex items-center space-x-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleExportJson}
              disabled={!dietPlan}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Diet Plan (JSON)</span>
            </motion.button>
          </div>
        </div>

        {/* Note on price/nutrition values */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 flex-shrink-0 text-indigo-500" />
          <span>Prices and nutrition values are approximate and can be edited in <code className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[11px]">foodData.ts</code>.</span>
        </div>
      </motion.div>

      {/* Main Grid: Controls on left, Results on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-panel rounded-2xl p-6 space-y-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Diet Settings</span>
            </h2>

            {/* Daily Budget Slider + Number Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="budgetSlider" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Daily Budget (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    id="budgetNumber"
                    min="10"
                    max="800"
                    step="5"
                    value={budget}
                    onChange={(e) => setBudget(Math.max(10, Number(e.target.value)))}
                    className="w-24 pl-7 pr-3 py-1.5 rounded-xl text-sm font-bold text-right glass-input text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <input
                type="range"
                id="budgetSlider"
                min="20"
                max="500"
                step="5"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                <span>₹20 (Student Budget)</span>
                <span>₹150 (Standard)</span>
                <span>₹500+ (Premium)</span>
              </div>
            </div>

            {/* Diet Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Diet Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['vegetarian', 'eggetarian', 'non-vegetarian'] as DietType[]).map((t) => (
                  <motion.button
                    key={t}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setDietType(t)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold capitalize border transition-all text-center ${
                      dietType === t
                        ? 'bg-indigo-50 dark:bg-indigo-600/25 border-indigo-500 text-indigo-700 dark:text-indigo-200 shadow-md shadow-indigo-600/15'
                        : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5'
                    }`}
                  >
                    {t === 'non-vegetarian' ? 'Non-Veg' : t === 'eggetarian' ? 'Eggetarian' : 'Pure Veg'}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Food Exclusions Multi-Select Accordion */}
            <div className="border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsExclusionOpen(!isExclusionOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/40 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-white/5 transition"
              >
                <span>Foods I don&apos;t eat ({excludedFoods.length} selected)</span>
                {isExclusionOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {isExclusionOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 max-h-52 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-white/5 bg-white/40 dark:bg-slate-950/40"
                  >
                    {FOOD_DATABASE.map((f) => {
                      const isExcluded = excludedFoods.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className="flex items-center justify-between pt-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer select-none"
                        >
                          <span className="truncate pr-2">{f.name}</span>
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExcludedFoods([...excludedFoods, f.id]);
                              } else {
                                setExcludedFoods(excludedFoods.filter((id) => id !== f.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Action Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: shouldReduceMotion ? 1 : 1.01 }}
              onClick={handleGenerateDiet}
              disabled={isGenerating}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating Optimal Nutrition...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Suggest My Diet</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Cheapest Protein Sources Card */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-panel rounded-2xl p-6 space-y-3"
          >
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold">Cheapest Indian Protein Sources</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ranked by grams of complete protein per ₹1 Rupee spent.
            </p>

            <div className="space-y-2 pt-1">
              {topCheapestProteins.map((food, idx) => (
                <div
                  key={food.id}
                  className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{food.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {food.servingUnit} • ₹{food.pricePerServing}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {food.proteinPerRupee.toFixed(2)}g P / ₹
                    </span>
                    <div className="text-[10px] text-slate-400">{food.protein}g protein</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Previous Plans History */}
          {previousPlans.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-2xl p-6 space-y-3"
            >
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
                <History className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold">Previous Saved Plans</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previousPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setBudget(plan.budget);
                      setDietType(plan.dietType as DietType);
                      setDietPlan({
                        budget: plan.budget,
                        dietType: plan.dietType as DietType,
                        targetCalories: 2000,
                        targetProtein: plan.totalProtein,
                        totalCost: plan.totalCost,
                        totalCalories: plan.totalCalories,
                        totalProtein: plan.totalProtein,
                        proteinPercentAchieved: 100,
                        caloriesPercentAchieved: 100,
                        isBudgetConstrained: false,
                        statusNote: `Viewing saved plan from ${new Date(plan.createdAt).toLocaleDateString()}.`,
                        meals: plan.meals,
                      });
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/30 hover:bg-slate-200/60 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        ₹{plan.budget} • {plan.dietType}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {plan.totalProtein}g P
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Health Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 flex items-start space-x-2.5 text-slate-500 dark:text-slate-400 text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
            <p>
              <strong>Health Note:</strong> This meal plan offers general nutritional guidance based on standard formulas. It is not medical or clinical dietary advice. Consult a licensed dietitian for specialized medical conditions.
            </p>
          </div>
        </div>

        {/* Right Column: Nutrition Targets & Meal Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-3 text-red-600 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {swapFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>{swapFeedback}</span>
            </motion.div>
          )}

          {dietPlan ? (
            <>
              {/* Summary Diagnostic Card */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel rounded-2xl p-6 border ${
                  dietPlan.isBudgetConstrained
                    ? 'border-amber-500/40 bg-amber-500/[0.04]'
                    : 'border-emerald-500/30 bg-emerald-500/[0.03]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Diet Target Diagnostic
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      Daily Summary &amp; Compliance
                    </h2>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      dietPlan.isBudgetConstrained
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    {dietPlan.isBudgetConstrained ? 'Budget Constrained' : 'Goals Achieved'}
                  </span>
                </div>

                {/* Honest Diagnostic Feedback Note */}
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-6 bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
                  {dietPlan.statusNote}
                </p>

                {/* Metric Bars: Cost, Calories, Protein */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Cost vs Budget */}
                  <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Total Cost
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      ₹{dietPlan.totalCost}{' '}
                      <span className="text-xs text-slate-500 font-normal">/ ₹{dietPlan.budget}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.round((dietPlan.totalCost / dietPlan.budget) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Calories vs Target */}
                  <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Total Calories
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {dietPlan.totalCalories}{' '}
                      <span className="text-xs text-slate-500 font-normal">/ {dietPlan.targetCalories} kcal</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full"
                        style={{ width: `${dietPlan.caloriesPercentAchieved}%` }}
                      />
                    </div>
                  </div>

                  {/* Protein vs Target */}
                  <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Total Protein
                    </div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {dietPlan.totalProtein}g{' '}
                      <span className="text-xs text-slate-500 font-normal">/ {dietPlan.targetProtein}g</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${dietPlan.proteinPercentAchieved}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Scientific Formula Breakdown Card */}
              {nutrition && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel rounded-2xl p-5 border border-indigo-500/20"
                >
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Flame className="w-4 h-4" />
                    <span>Mifflin-St Jeor Scientific Breakdown</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p>{nutrition.explanation.bmrText}</p>
                    <p>{nutrition.explanation.tdeeText}</p>
                    <p>{nutrition.explanation.goalText} {nutrition.explanation.proteinText}</p>
                  </div>
                </motion.div>
              )}

              {/* Meals List (Breakfast, Lunch, Evening Snack, Dinner) */}
              <div className="space-y-4">
                {dietPlan.meals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="glass-panel glass-panel-hover rounded-2xl p-5"
                  >
                    {/* Meal Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                          {mealIcons[meal.name] || <Utensils className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {meal.name}
                          </h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{meal.timeHint}</span>
                          </span>
                        </div>
                      </div>

                      {/* Meal Totals */}
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">₹{meal.mealCost}</span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {meal.mealCalories} kcal • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{meal.mealProtein}g P</span>
                        </div>
                      </div>
                    </div>

                    {/* Meal Foods */}
                    <div className="space-y-2">
                      {meal.foods.map((food) => (
                        <div
                          key={food.foodId}
                          className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/30 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {food.name}
                              </span>
                              {food.quantity > 1 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300">
                                  × {food.quantity}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {food.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {food.servingUnit} • {food.calories} kcal • {food.carbs}g C • {food.fat}g F
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {food.protein}g protein
                              </span>
                              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                ₹{food.cost}
                              </div>
                            </div>

                            {/* Interactive Swap Button */}
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.94 }}
                              whileHover={{ scale: 1.05 }}
                              onClick={() => handleSwap(meal.id, food.foodId, food.name)}
                              title={`Swap ${food.name} with another option`}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/30 transition flex items-center space-x-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Swap</span>
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-2xl p-12 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                <Utensils className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ready to Build Your Diet Plan</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                Adjust your daily rupee budget on the left, pick your diet preference, and click &ldquo;Suggest My Diet&rdquo; to generate a customized 4-meal Indian meal plan.
              </p>
              <button
                type="button"
                onClick={handleGenerateDiet}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-xl shadow-indigo-600/25 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Diet Now</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
