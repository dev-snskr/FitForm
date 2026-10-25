'use client';

// src/app/progress/page.tsx
// FitForm Personal Analytics & Progress Dashboard (/progress)
// Features:
// - Summary cards: Average form score, best set, total reps, total workout minutes
// - Streak counter, 7-day week dots, and 30-day program heatmap with risk alerts
// - Biomechanical form accuracy over time with trend line and exercise filter
// - Bodyweight progression graph with delta display and inline logging
// - Weekly volume and workout consistency bars
// - Most frequent form mistakes breakdown with actionable coaching tip
// - 14-badge achievement wall with progress bars for locked badges
// - Celebratory popup modal for newly earned badges
// - Development-only demo data generator/cleaner

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Award,
  Clock,
  Dumbbell,
  ArrowRight,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { getStoredActiveUserId } from '@/lib/profileStorage';
import StreakAndHeatmapCard from '@/components/progress/StreakAndHeatmapCard';
import FormScoreChart from '@/components/progress/FormScoreChart';
import WeightChart from '@/components/progress/WeightChart';
import VolumeChart from '@/components/progress/VolumeChart';
import MistakesBreakdownChart from '@/components/progress/MistakesBreakdownChart';
import BadgeWall, { EvaluatedBadge } from '@/components/progress/BadgeWall';
import BadgeUnlockModal, { UnlockedBadgeInfo } from '@/components/progress/BadgeUnlockModal';
import DemoDataControls from '@/components/progress/DemoDataControls';
import { StreakAnalysisResult } from '@/lib/progress/streakCalculator';

interface ProgressDashboardData {
  user: {
    id: number;
    name: string;
    goal: string;
    experience: string;
    isDemo: boolean;
  };
  isEmpty: boolean;
  summary: {
    averageFormScore: number | null;
    bestSet: {
      exercise: string;
      formScore: number;
      reps: number;
      durationSeconds: number | null;
      dayNumber: number;
      date: string;
    } | null;
    totalReps: number;
    totalPlankSeconds: number;
    totalWorkoutMinutes: number;
    totalWorkoutsCompleted: number;
    totalSets: number;
  };
  streak: StreakAnalysisResult;
  badges: EvaluatedBadge[];
  charts: {
    formScoreOverTime: {
      dayNumber: number;
      label: string;
      date: string;
      avgScore: number;
      bestScore: number;
    }[];
    weightHistory: {
      startWeight: number;
      currentWeight: number;
      weightDelta: number;
      entries: { date: string; weightKg: number }[];
    };
    weeklyVolume: {
      week: string;
      weekNumber: number;
      totalReps: number;
      totalPlankSeconds: number;
      workoutsCompleted: number;
      workoutsPlanned: number;
    }[];
    mistakesBreakdown: { mistake: string; count: number }[];
    topMistakeTip: string | null;
    exerciseFormTrends: Record<string, { dayNumber: number; date: string; score: number }[]>;
  };
}

export default function ProgressDashboardPage() {
  const shouldReduceMotion = useReducedMotion();

  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<ProgressDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Badge celebration state
  const [celebrationBadge, setCelebrationBadge] = useState<UnlockedBadgeInfo | null>(null);
  const hasCheckedBadgesRef = useRef<boolean>(false);

  const fetchDashboardData = useCallback(async () => {
    const activeId = getStoredActiveUserId();
    if (!activeId) {
      setIsLoading(false);
      setErrorMessage('No active profile found. Please select or create a profile.');
      return;
    }
    setUserId(activeId);

    try {
      const res = await fetch(`/api/progress?userId=${activeId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load progress dashboard');
      }
      const json: ProgressDashboardData = await res.json();
      setData(json);

      // Check for newly earned badges not yet shown in this browser session
      if (!hasCheckedBadgesRef.current && json.badges) {
        hasCheckedBadgesRef.current = true;
        const storageKey = `fitform_shown_badges_${activeId}`;
        const shownIds = new Set<string>(
          JSON.parse(localStorage.getItem(storageKey) || '[]')
        );

        const newlyEarned = json.badges.find(
          (b) => b.isUnlocked && !shownIds.has(b.id)
        );

        if (newlyEarned) {
          shownIds.add(newlyEarned.id);
          localStorage.setItem(storageKey, JSON.stringify(Array.from(shownIds)));
          setCelebrationBadge({
            id: newlyEarned.id,
            name: newlyEarned.name,
            description: newlyEarned.description,
            iconKey: newlyEarned.iconKey,
            gradient: newlyEarned.gradient,
          });
        }
      }
    } catch (err: unknown) {
      console.error('Progress page fetch error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Loading Your Fitness Dashboard...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Aggregating streaks, biomechanical form scores, and achievements
        </p>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center min-h-[60vh]">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Unable to Load Dashboard
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">{errorMessage}</p>
        <Link
          href="/plan"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25"
        >
          Return to Workout Plan
        </Link>
      </div>
    );
  }

  // Empty State: User has not completed any workouts yet
  if (data.isEmpty) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
        <DemoDataControls onRefresh={fetchDashboardData} />

        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border shadow-xl flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shadow-md">
            <TrendingUp className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            No Workout Data Yet
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Complete your first workout to unlock your personal progress charts, streak tracking, and achievement badges!
          </p>

          <Link
            href="/plan"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98"
          >
            <span>Start Day 1 Workout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { summary, streak, badges, charts, user } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Badge Unlock Celebration Modal */}
      <BadgeUnlockModal
        badge={celebrationBadge}
        onClose={() => setCelebrationBadge(null)}
      />

      {/* Development Demo Data Controls */}
      <DemoDataControls onRefresh={fetchDashboardData} />

      {/* Page Title & Profile Welcome */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              Personal Analytics
            </span>
            {user.isDemo && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                Demo Profile
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Progress &amp; Achievements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track your consistency, computer-vision form mastery, and physical transformations.
          </p>
        </div>

        <Link
          href="/plan"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 self-start sm:self-auto cursor-pointer active:scale-98"
        >
          <span>Continue Workout</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {/* 4 Headline Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Form Score */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-4 sm:p-5 border shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Form Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.averageFormScore !== null ? `${summary.averageFormScore}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Biomechanical average
          </div>
        </motion.div>

        {/* Best Set */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-4 sm:p-5 border shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Best Recorded Set
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
            {summary.bestSet ? `${summary.bestSet.formScore}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {summary.bestSet ? `${summary.bestSet.exercise}` : 'No scored sets yet'}
          </div>
        </motion.div>

        {/* Total Reps */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-4 sm:p-5 border shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Reps
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {summary.totalReps}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            + {summary.totalPlankSeconds}s plank hold
          </div>
        </motion.div>

        {/* Total Workout Minutes */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-4 sm:p-5 border shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Time Under Iron
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
            {summary.totalWorkoutMinutes}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Across {summary.totalSets} logged sets
          </div>
        </motion.div>
      </div>

      {/* Streaks & 30-Day Heatmap Card */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <StreakAndHeatmapCard streak={streak} />
      </motion.div>

      {/* Main Charts Grid: Form Score Over Time & Weight Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <FormScoreChart
            overallData={charts.formScoreOverTime}
            exerciseTrends={charts.exerciseFormTrends}
          />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {userId && (
            <WeightChart
              userId={userId}
              startWeight={charts.weightHistory.startWeight}
              currentWeight={charts.weightHistory.currentWeight}
              weightDelta={charts.weightHistory.weightDelta}
              entries={charts.weightHistory.entries}
              onWeightLogged={fetchDashboardData}
            />
          )}
        </motion.div>
      </div>

      {/* Secondary Charts: Weekly Volume & Biomechanical Mistakes Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <VolumeChart data={charts.weeklyVolume} />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <MistakesBreakdownChart
            mistakes={charts.mistakesBreakdown}
            topMistakeTip={charts.topMistakeTip}
          />
        </motion.div>
      </div>

      {/* 14-Badge Achievement Wall */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <BadgeWall badges={badges} />
      </motion.div>
    </div>
  );
}
