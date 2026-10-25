'use client';

// src/app/progress/page.tsx
// FitForm Real Biometric & Progress Analytics Dashboard (/progress)
// Features:
// - Time range selector (7 Days, 30 Days, Whole Program)
// - Headline stats: Avg Form Score, Best Set, Total Reps, Time Under Iron, Estimated Calories
// - Educational "How is this calculated?" plain-language modal
// - Profile completion card for optional target weight and waist circumference
// - Weekly Check-in Card (Weight, Waist, Chest, Hips, Arm)
// - Dynamic rule-based plain-language insights (3-5 coaching observations, 0 AI)
// - Projected Goal Date with 1% safe pacing velocity warning
// - Personal Records (PRs) wall with "New PR" tags
// - Streaks & Heatmap card
// - Charts: Form progression, Weight history, Weekly Volume & Adherence, Mistakes Breakdown
// - Achievement Badge Wall with unlock celebration modal

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
  HelpCircle,
  Flame,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
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
import ProfileCompletionCard from '@/components/progress/ProfileCompletionCard';
import WeeklyCheckInCard, { BodyMeasurementEntry } from '@/components/progress/WeeklyCheckInCard';
import PersonalRecordsCard from '@/components/progress/PersonalRecordsCard';
import HowIsThisCalculatedModal from '@/components/progress/HowIsThisCalculatedModal';
import { StreakAnalysisResult } from '@/lib/progress/streakCalculator';
import { UserMetricsResult } from '@/lib/progress/metricsCalculator';

interface ProgressDashboardData {
  user: {
    id: number;
    name: string;
    goal: string;
    experience: string;
    weightKg: number;
    targetWeightKg?: number | null;
    waistCm?: number | null;
    isDemo: boolean;
  };
  isEmpty: boolean;
  timeRange: '7d' | '30d' | 'all';
  metrics: UserMetricsResult;
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
    estimatedCalories: number;
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
      entries: BodyMeasurementEntry[];
    };
    weeklyVolume: {
      week: string;
      weekNumber: number;
      totalReps: number;
      totalVolumeKg?: number;
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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Badge celebration state
  const [celebrationBadge, setCelebrationBadge] = useState<UnlockedBadgeInfo | null>(null);
  const hasCheckedBadgesRef = useRef<boolean>(false);

  const fetchDashboardData = useCallback(async (range: '7d' | '30d' | 'all' = timeRange) => {
    const activeId = getStoredActiveUserId();
    if (!activeId) {
      setIsLoading(false);
      setErrorMessage('No active profile found. Please select or create a profile.');
      return;
    }
    setUserId(activeId);

    try {
      const res = await fetch(`/api/progress?userId=${activeId}&timeRange=${range}`);
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
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [fetchDashboardData, timeRange]);

  const handleTimeRangeChange = (newRange: '7d' | '30d' | 'all') => {
    setTimeRange(newRange);
    setIsLoading(true);
    fetchDashboardData(newRange);
  };

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Loading Your Fitness Dashboard...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Aggregating streaks, biomechanical form scores, and verified metrics
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
        <DemoDataControls onRefresh={() => fetchDashboardData(timeRange)} />

        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border shadow-xl flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shadow-md">
            <TrendingUp className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            No Workout Data Yet
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Complete your first workout to unlock your personal progress charts, streak tracking, strength volume, and achievement badges!
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

  const { summary, streak, badges, charts, user, metrics } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Educational Modal: How is this calculated? */}
      <HowIsThisCalculatedModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Badge Unlock Celebration Modal */}
      <BadgeUnlockModal
        badge={celebrationBadge}
        onClose={() => setCelebrationBadge(null)}
      />

      {/* Development Demo Data Controls */}
      <DemoDataControls onRefresh={() => fetchDashboardData(timeRange)} />

      {/* Page Title & Controls */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
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
            Track your consistency, computer-vision form mastery, strength volume, and physical transformation.
          </p>
        </div>

        {/* Time Range Selector & How Is This Calculated Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10">
            {(['all', '30d', '7d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range === 'all' ? 'Whole Program' : range === '30d' ? '30 Days' : '7 Days'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            title="Learn how every metric is calculated"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">How is this calculated?</span>
          </button>

          <Link
            href="/plan"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 cursor-pointer active:scale-98"
          >
            <span>Continue Workout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Dismissible Profile Completion Card (Target Weight / Waist) */}
      {userId && (!user.targetWeightKg || !user.waistCm) && (
        <ProfileCompletionCard
          userId={userId}
          initialTargetWeight={user.targetWeightKg}
          initialWaist={user.waistCm}
          onSaved={() => fetchDashboardData(timeRange)}
        />
      )}

      {/* 5 Headline Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Average Form Score */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-4 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Form
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.averageFormScore !== null ? `${summary.averageFormScore}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Computer vision accuracy
          </div>
        </motion.div>

        {/* Consistency Adherence */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-4 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Consistency
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {metrics?.consistency?.consistencyPercentage ?? 100}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {metrics?.consistency?.completedWorkouts ?? summary.totalWorkoutsCompleted} of{' '}
            {metrics?.consistency?.plannedWorkouts ?? summary.totalWorkoutsCompleted} planned days
          </div>
        </motion.div>

        {/* Total Reps */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-4 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Reps
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary.totalReps}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            + {summary.totalPlankSeconds}s planks
          </div>
        </motion.div>

        {/* Estimated Calories */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-4 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Burned
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Est.
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics?.calories?.totalCalories ?? summary.estimatedCalories ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            kcal via Compendium METs
          </div>
        </motion.div>

        {/* Workout Time */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel rounded-2xl p-4 border shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Time Under Iron
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {summary.totalWorkoutMinutes}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Across {summary.totalSets} logged sets
          </div>
        </motion.div>
      </div>

      {/* Rule-Based Plain-Language Insights Banner */}
      {metrics?.insights && metrics.insights.length > 0 && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="glass-panel rounded-3xl p-5 sm:p-6 border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 via-cyan-500/5 to-purple-500/5 shadow-sm"
        >
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Training Insights &amp; Coach Observations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.insights.map((insight, idx) => {
              const iconMap = {
                flawless: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
                improved: <TrendingUp className="w-4 h-4 text-cyan-500 flex-shrink-0" />,
                streak: <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
                milestone: <Award className="w-4 h-4 text-purple-500 flex-shrink-0" />,
                info: <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
              };
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300"
                >
                  <div className="mt-0.5">{iconMap[insight.type] || iconMap.info}</div>
                  <span className="leading-relaxed">{insight.text}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Target Progress & Projected Goal Date Banner */}
      {metrics?.body && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Goal Trajectory
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {metrics.body.projectedGoalDate ? (
                  <>
                    Estimated Goal Date:{' '}
                    <span className="text-purple-600 dark:text-purple-400 font-black">
                      {metrics.body.projectedGoalDate}
                    </span>
                  </>
                ) : (
                  'Projected Goal Completion'
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                {metrics.body.projectionReason}
              </p>
            </div>

            {metrics.body.targetProgressPercentage !== null && (
              <div className="sm:text-right min-w-[140px]">
                <div className="text-xs font-bold text-slate-500 uppercase">Target Progress</div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {metrics.body.targetProgressPercentage}%
                </div>
              </div>
            )}
          </div>

          {/* Safety Pacing Warning if rate > 1% bodyweight / week */}
          {metrics.body.isRateHealthy === false && metrics.body.healthyRateWarning && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{metrics.body.healthyRateWarning}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Streaks & 30-Day Heatmap Card */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
      >
        <StreakAndHeatmapCard streak={streak} />
      </motion.div>

      {/* Personal Records (PRs) Milestones */}
      {metrics?.strength?.personalRecords && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          <PersonalRecordsCard records={metrics.strength.personalRecords} />
        </motion.div>
      )}

      {/* Weekly Check-in Card (Weight, Waist, Chest, Hips, Arm) */}
      {userId && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <WeeklyCheckInCard
            userId={userId}
            currentWeightKg={charts.weightHistory.currentWeight}
            entries={charts.weightHistory.entries}
            onCheckInLogged={() => fetchDashboardData(timeRange)}
          />
        </motion.div>
      )}

      {/* Main Charts Grid: Form Score Over Time & Weight Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          <FormScoreChart
            overallData={charts.formScoreOverTime}
            exerciseTrends={charts.exerciseFormTrends}
          />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {userId && (
            <WeightChart
              userId={userId}
              startWeight={charts.weightHistory.startWeight}
              currentWeight={charts.weightHistory.currentWeight}
              weightDelta={charts.weightHistory.weightDelta}
              entries={charts.weightHistory.entries}
              onWeightLogged={() => fetchDashboardData(timeRange)}
            />
          )}
        </motion.div>
      </div>

      {/* Secondary Charts: Weekly Volume & Biomechanical Mistakes Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <VolumeChart data={charts.weeklyVolume} />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
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
        transition={{ delay: 0.46 }}
      >
        <BadgeWall badges={badges} />
      </motion.div>
    </div>
  );
}
