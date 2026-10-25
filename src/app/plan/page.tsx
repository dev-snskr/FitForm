'use client';

// FitForm 30-Day Plan Grid Page (/plan)
// Upgraded with:
// - Framer Motion staggered entrance wave for Day 1 - 30 cards.
// - Smooth hover lift and glowing micro-interactions.
// - High-contrast Light & Dark mode support across all cards and stats.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Activity,
  Coffee,
  PlusCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getStoredActiveUserId, setStoredActiveUserId } from '@/lib/profileStorage';

interface DaySummary {
  id: number;
  dayNumber: number;
  workoutType: string;
  isRest: boolean;
  exerciseCount: number;
  status: 'not_started' | 'completed';
}

interface UserProfile {
  id: number;
  name: string;
  goal: string;
  experience: string;
  daysPerWeek: number;
}

export default function PlanPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        let activeId = getStoredActiveUserId();

        if (!activeId) {
          const userRes = await fetch('/api/users');
          if (!userRes.ok) throw new Error('Failed to load profiles');
          const userData = await userRes.json();
          const userList = userData.users || [];

          if (userList.length === 0) {
            router.replace('/onboarding');
            return;
          }

          activeId = userList[0].id;
          setStoredActiveUserId(activeId as number);
        }

        const planRes = await fetch(`/api/plan?userId=${activeId}`);
        if (!planRes.ok) {
          if (planRes.status === 404) {
            router.replace('/onboarding');
            return;
          }
          throw new Error('Could not retrieve workout plan');
        }

        const planData = await planRes.json();
        setUser(planData.user);
        setDays(planData.days || []);
      } catch (err: unknown) {
        console.error('Plan loading error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to load workout plan. Please refresh.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPlanData();
  }, [router]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Loading Your Plan...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Retrieving 30-day program &amp; workout logs
        </p>
      </div>
    );
  }

  // Error State
  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unable to Load Plan</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{errorMessage}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/25 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty State: No User or Empty Days
  if (!user || days.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Workout Plan Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          You haven&apos;t created a fitness profile yet. Get started by setting up your metrics.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-xl shadow-indigo-600/25 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Profile</span>
        </Link>
      </div>
    );
  }

  const completedDaysCount = days.filter((d) => d.status === 'completed').length;
  const progressPercent = Math.round((completedDaysCount / 30) * 100);

  const goalIcons: Record<string, React.ReactNode> = {
    fat_loss: <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    muscle_gain: <Dumbbell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    maintain: <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  };

  // Animation variants for staggered wave
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.025,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Profile Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
                {goalIcons[user.goal] || <Sparkles className="w-3.5 h-3.5" />}
                <span className="capitalize">{user.goal.replace('_', ' ')}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {user.experience} • {user.daysPerWeek} days/wk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {user.name}&apos;s 30-Day Program
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select any day to inspect target exercises, sets, reps, and form guidance.
            </p>
          </div>

          {/* Quick Progress Stats */}
          <div className="flex items-center space-x-4 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl p-4">
            <div className="text-center">
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                {completedDaysCount}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> / 30</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                Completed
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 leading-none">
                {progressPercent}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                Progress
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-full bg-slate-200/80 dark:bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-300/40 dark:border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 3)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full"
          />
        </div>
      </motion.div>

      {/* 30-Day Grid with Staggered Waves */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {days.map((day) => {
          const isCompleted = day.status === 'completed';
          const isRest = day.isRest;

          return (
            <motion.div
              key={day.dayNumber}
              variants={cardVariants}
              whileHover={{ y: shouldReduceMotion ? 0 : -3 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={`/plan/${day.dayNumber}`}
                className={`group glass-panel rounded-xl p-4 flex flex-col justify-between h-full border transition-all duration-200 ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 hover:border-emerald-500 dark:hover:border-emerald-400'
                    : isRest
                    ? 'border-slate-200/80 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-white/20'
                    : 'border-slate-200/90 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10'
                }`}
              >
                <div>
                  {/* Card Top: Day number + Status badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                      Day {day.dayNumber}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        Completed
                      </span>
                    ) : isRest ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded-full">
                        <Coffee className="w-3 h-3 mr-1" />
                        Rest
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 mr-1" />
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Workout Title */}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                    {day.workoutType}
                  </h3>
                </div>

                {/* Card Bottom: Exercise Count & Arrow */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {isRest ? 'Recovery day' : `${day.exerciseCount} exercises`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
