// FitForm Diet Plans API Route
// Calculates personalized nutrition targets, generates budget-tailored diet plans,
// persists diet records in SQLite, and provides JSON exports.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateNutritionTargets } from '@/lib/nutrition';
import { generateDietPlan } from '@/lib/mealPlanner';
import { DietType } from '@/lib/foodData';

export const dynamic = 'force-dynamic';

// GET: retrieve saved diet plans for a user or export as JSON
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const format = searchParams.get('format'); // 'json'

    if (!userIdParam) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const savedPlans = await prisma.dietPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Format saved plans
    const formattedPlans = savedPlans.map((p) => ({
      id: p.id,
      userId: p.userId,
      budget: p.budget,
      dietType: p.dietType,
      excludedFoods: JSON.parse(p.excludedFoods || '[]'),
      targetCalories: p.targetCalories,
      targetProtein: p.targetProtein,
      totalCost: p.totalCost,
      totalCalories: p.totalCalories,
      totalProtein: p.totalProtein,
      meals: JSON.parse(p.mealsJson || '[]'),
      createdAt: p.createdAt.toISOString(),
    }));

    // Handle JSON Export
    if (format === 'json') {
      const activeOrLatestPlan = formattedPlans[0] || null;
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          name: user.name,
          goal: user.goal,
          weightKg: user.weightKg,
          daysPerWeek: user.daysPerWeek,
        },
        currentPlan: activeOrLatestPlan,
        historyCount: formattedPlans.length,
      };

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fitform_diet_plan.json"',
        },
      });
    }

    return NextResponse.json({
      plans: formattedPlans,
      latestPlan: formattedPlans[0] || null,
    });
  } catch (error) {
    console.error('Failed to retrieve diet plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: generate diet plan, compute targets, and optionally save to DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, budget = 150, dietType = 'vegetarian', excludedFoodIds = [], savePlan = true } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate scientifically tailored nutrition targets
    const nutrition = calculateNutritionTargets({
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      goal: user.goal,
      daysPerWeek: user.daysPerWeek,
    });

    // Run deterministic meal planner engine
    const plan = generateDietPlan(
      Number(budget),
      dietType as DietType,
      Array.isArray(excludedFoodIds) ? excludedFoodIds : [],
      nutrition.targetCalories,
      nutrition.proteinGrams
    );

    // Save plan into SQLite
    let savedRecord = null;
    if (savePlan) {
      savedRecord = await prisma.dietPlan.create({
        data: {
          userId: user.id,
          budget: Number(budget),
          dietType: dietType,
          excludedFoods: JSON.stringify(excludedFoodIds || []),
          targetCalories: nutrition.targetCalories,
          targetProtein: nutrition.proteinGrams,
          totalCost: plan.totalCost,
          totalCalories: plan.totalCalories,
          totalProtein: plan.totalProtein,
          mealsJson: JSON.stringify(plan.meals),
        },
      });
    }

    return NextResponse.json({
      success: true,
      nutrition,
      plan,
      savedPlanId: savedRecord?.id,
    });
  } catch (error) {
    console.error('Failed to generate diet plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
