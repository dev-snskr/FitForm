// src/app/api/weight/route.ts
// FitForm Weight Tracking API
// - GET: Retrieves user's weight entries, start weight, current weight, delta, or exports as JSON.
// - POST: Logs or updates weight entry for a specified date (30kg to 250kg validation, 1 entry/day).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatToLocalDateString } from '@/lib/progress/streakCalculator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get('userId');
    const format = searchParams.get('format');

    if (!userIdStr) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, weightKg: true, targetWeightKg: true, waistCm: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let entries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    // Auto-seed initial entry from onboarding weight if empty
    if (entries.length === 0) {
      const initialDate = formatToLocalDateString(new Date(user.createdAt));
      const seeded = await prisma.weightEntry.create({
        data: {
          userId,
          weightKg: user.weightKg,
          date: initialDate,
        },
      });
      entries = [seeded];
    }

    const startWeight = entries[0]?.weightKg ?? user.weightKg;
    const currentWeight = entries[entries.length - 1]?.weightKg ?? user.weightKg;
    const weightDelta = Number((currentWeight - startWeight).toFixed(1));

    // Handle JSON download export
    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, name: user.name },
        summary: { startWeight, currentWeight, weightDelta },
        entries,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="fitform_weight_logs_user_${userId}.json"`,
        },
      });
    }

    return NextResponse.json({
      startWeight,
      currentWeight,
      weightDelta,
      entries,
    });
  } catch (err: unknown) {
    console.error('Error fetching weight entries:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, weightKg, waistCm, chestCm, hipsCm, armCm, date } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Valid userId is required' }, { status: 400 });
    }

    const numericWeight = Number(weightKg);
    if (isNaN(numericWeight) || numericWeight < 30 || numericWeight > 250) {
      return NextResponse.json(
        { error: 'Weight must be a valid number between 30 kg and 250 kg' },
        { status: 400 }
      );
    }

    // Optional measurements validation
    let parsedWaist: number | null = null;
    if (waistCm !== undefined && waistCm !== null && waistCm !== '') {
      parsedWaist = Number(waistCm);
      if (isNaN(parsedWaist) || parsedWaist < 40 || parsedWaist > 200) {
        return NextResponse.json(
          { error: 'Waist must be between 40 cm and 200 cm' },
          { status: 400 }
        );
      }
      parsedWaist = Number(parsedWaist.toFixed(1));
    }

    let parsedChest: number | null = null;
    if (chestCm !== undefined && chestCm !== null && chestCm !== '') {
      parsedChest = Number(chestCm);
      if (isNaN(parsedChest) || parsedChest < 40 || parsedChest > 200) {
        return NextResponse.json(
          { error: 'Chest must be between 40 cm and 200 cm' },
          { status: 400 }
        );
      }
      parsedChest = Number(parsedChest.toFixed(1));
    }

    let parsedHips: number | null = null;
    if (hipsCm !== undefined && hipsCm !== null && hipsCm !== '') {
      parsedHips = Number(hipsCm);
      if (isNaN(parsedHips) || parsedHips < 40 || parsedHips > 200) {
        return NextResponse.json(
          { error: 'Hips must be between 40 cm and 200 cm' },
          { status: 400 }
        );
      }
      parsedHips = Number(parsedHips.toFixed(1));
    }

    let parsedArm: number | null = null;
    if (armCm !== undefined && armCm !== null && armCm !== '') {
      parsedArm = Number(armCm);
      if (isNaN(parsedArm) || parsedArm < 15 || parsedArm > 70) {
        return NextResponse.json(
          { error: 'Arm must be between 15 cm and 70 cm' },
          { status: 400 }
        );
      }
      parsedArm = Number(parsedArm.toFixed(1));
    }

    const entryDate = date || formatToLocalDateString(new Date());

    // Upsert entry (one entry per date per user, editable for today)
    const updateData: {
      weightKg: number;
      recordedAt: Date;
      waistCm?: number | null;
      chestCm?: number | null;
      hipsCm?: number | null;
      armCm?: number | null;
    } = {
      weightKg: Number(numericWeight.toFixed(1)),
      recordedAt: new Date(),
    };
    const createData: {
      userId: number;
      weightKg: number;
      date: string;
      waistCm?: number | null;
      chestCm?: number | null;
      hipsCm?: number | null;
      armCm?: number | null;
    } = {
      userId,
      weightKg: Number(numericWeight.toFixed(1)),
      date: entryDate,
    };

    if (parsedWaist !== null) {
      updateData.waistCm = parsedWaist;
      createData.waistCm = parsedWaist;
    }
    if (parsedChest !== null) {
      updateData.chestCm = parsedChest;
      createData.chestCm = parsedChest;
    }
    if (parsedHips !== null) {
      updateData.hipsCm = parsedHips;
      createData.hipsCm = parsedHips;
    }
    if (parsedArm !== null) {
      updateData.armCm = parsedArm;
      createData.armCm = parsedArm;
    }

    const entry = await prisma.weightEntry.upsert({
      where: {
        userId_date: {
          userId,
          date: entryDate,
        },
      },
      update: updateData,
      create: createData,
    });

    // Also keep user profile weightKg (and waistCm if provided) up to date with latest entry
    const userUpdateData: { weightKg: number; waistCm?: number } = {
      weightKg: Number(numericWeight.toFixed(1)),
    };
    if (parsedWaist !== null) {
      userUpdateData.waistCm = parsedWaist;
    }

    await prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
    });

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (err: unknown) {
    console.error('Error recording weight entry:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
