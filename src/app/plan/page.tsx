'use client';

// FitForm 30-Day Plan Grid Page (/plan)
// Displays Day 1 to Day 30 cards with workout type, rest days, and completion status.

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

  const [user, setUser] = useState<UserProfile | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Find active user ID from storage
        let activeId = getStoredActiveUserId();

        // If no stored ID, fetch available users
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

        // Fetch plan for active user
        const planRes = await fetch(`/api/plan?userId=${activeId}`);
        if (!planRes.ok) {
          if (planRes.status === 404) {
            // Profile may have been deleted or invalid
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
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-white">Loading Your Plan...</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving 30-day program & workout logs</p>
      </div>
    );
  }

  // Error State
  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Unable to Load Plan</h2>
        <p className="text-sm text-slate-400 mb-6">{errorMessage}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
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
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Workout Plan Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          You haven&apos;t created a fitness profile yet. Get started by setting up your metrics.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-xl shadow-indigo-600/30"
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
    fat_loss: <Flame className="w-4 h-4 text-amber-400" />,
    muscle_gain: <Dumbbell className="w-4 h-4 text-indigo-400" />,
    maintain: <Activity className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header Profile Dashboard */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center space-x-1.5">
                {goalIcons[user.goal] || <Sparkles className="w-3.5 h-3.5" />}
                <span className="capitalize">{user.goal.replace('_', ' ')}</span>
              </span>
              <span className="text-xs text-slate-400 capitalize">
                {user.experience} • {user.daysPerWeek} days/wk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user.name}&apos;s 30-Day Program
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select any day to inspect target exercises, sets, reps, and form guidance.
            </p>
          </div>

          {/* Quick Progress Stats */}
          <div className="flex items-center space-x-4 bg-slate-900/60 border border-white/10 rounded-xl p-4">
            <div className="text-center">
              <div className="text-2xl font-black text-indigo-400 leading-none">
                {completedDaysCount}
                <span className="text-xs text-slate-400 font-normal"> / 30</span>
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                Completed
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-400 leading-none">
                {progressPercent}%
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                Progress
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progressPercent, 2)}%` }}
          />
        </div>
      </div>

      {/* 30-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {days.map((day) => {
          const isCompleted = day.status === 'completed';
          const isRest = day.isRest;

          return (
            <Link
              key={day.dayNumber}
              href={`/plan/${day.dayNumber}`}
              className={`group glass-panel rounded-xl p-4 flex flex-col justify-between transition-all duration-200 border ${
                isCompleted
                  ? 'border-emerald-500/40 bg-emerald-950/15 hover:border-emerald-400'
                  : isRest
                  ? 'border-white/5 bg-slate-900/30 hover:border-white/20'
                  : 'border-white/10 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10'
              }`}
            >
              <div>
                {/* Card Top: Day number + Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                    Day {day.dayNumber}
                  </span>

                  {isCompleted ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </span>
                  ) : isRest ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full">
                      <Coffee className="w-3 h-3 mr-1" />
                      Rest
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 mr-1" />
                      Not Started
                    </span>
                  )}
                </div>

                {/* Workout Title */}
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                  {day.workoutType}
                </h3>
              </div>

              {/* Card Bottom: Exercise Count & Arrow */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {isRest ? 'Recovery day' : `${day.exerciseCount} exercises`}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
