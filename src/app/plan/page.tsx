'use client';

// FitForm 30-Day Program Interactive Glass Timeline
// Replaces grid with a vertical glass spine timeline featuring:
// - Alternating cards on desktop, left-spine on mobile.
// - Sticky week headers with week completion count and circular progress ring.
// - Distinct spine nodes: Completed (check), Up next (pulsing glow), Not started (hollow), Rest (moon).
// - Glass cards with exercise chips, estimated duration, and hover accent glows.
// - Scroll-linked luminous spine progress line pre-filled to last completed day.
// - Smooth auto-scroll on mount to "Up next" day + floating "Jump to Up next" button.
// - Full Light & Dark mode contrast compliance.
// - Optimized performance (memoized data, hardware-accelerated transforms, no nested blur).

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Check,
  Play,
  ArrowDown,
  Timer,
  Layers,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getStoredActiveUserId, setStoredActiveUserId } from '@/lib/profileStorage';
import { generate30DayPlan, GeneratedDay } from '@/lib/planGenerator';

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

interface WeekGroup {
  weekNumber: number;
  title: string;
  days: (DaySummary & {
    exercises: string[];
    estimatedMinutes: number;
    isUpNext: boolean;
  })[];
  completedCount: number;
  totalCount: number;
  percent: number;
}

const WEEK_TITLES: Record<number, string> = {
  1: 'Week 1 · Foundation',
  2: 'Week 2 · Build',
  3: 'Week 3 · Push',
  4: 'Week 4 · Peak',
  5: 'Week 5 · Finale',
};

export default function PlanPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const upNextCardRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch User Profile and Plan Data
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

  // 2. Deterministic Exercise Lookups & Duration calculation (Memoized)
  const deterministicPlan = useMemo<GeneratedDay[]>(() => {
    if (!user) return [];
    return generate30DayPlan(user.goal, user.experience, user.daysPerWeek);
  }, [user]);

  // Find the single "Up Next" day: the first incomplete workout day
  const upNextDayNumber = useMemo(() => {
    const nextDay = days.find((d) => !d.isRest && d.status !== 'completed');
    return nextDay ? nextDay.dayNumber : null;
  }, [days]);

  // Completed count and last completed index
  const completedDaysCount = useMemo(() => {
    return days.filter((d) => d.status === 'completed').length;
  }, [days]);

  const lastCompletedIndex = useMemo(() => {
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].status === 'completed') return i;
    }
    return -1;
  }, [days]);

  const progressPercent = Math.round((completedDaysCount / 30) * 100);

  // 3. Group Days into 5 Weeks with exercises & completion stats (Memoized)
  const weekGroups = useMemo<WeekGroup[]>(() => {
    if (days.length === 0) return [];

    const groups: WeekGroup[] = [];
    const weekCount = 5;

    for (let w = 1; w <= weekCount; w++) {
      const startDay = (w - 1) * 7 + 1;
      const endDay = Math.min(w * 7, 30);
      const weekDaysRaw = days.slice(startDay - 1, endDay);

      const enrichedDays = weekDaysRaw.map((day) => {
        const generated = deterministicPlan[day.dayNumber - 1];
        const exerciseNames = generated?.exercises?.map((e) => e.exerciseName) || [];

        // Estimate workout duration in minutes
        let durationMins = 0;
        if (!day.isRest && generated?.exercises) {
          const totalSeconds = generated.exercises.reduce(
            (acc, ex) => acc + ex.sets * (42 + ex.restSeconds),
            0
          );
          durationMins = Math.max(15, Math.round(totalSeconds / 60));
        }

        return {
          ...day,
          exercises: exerciseNames,
          estimatedMinutes: durationMins,
          isUpNext: day.dayNumber === upNextDayNumber,
        };
      });

      const completedInWeek = enrichedDays.filter((d) => d.status === 'completed').length;
      const totalInWeek = enrichedDays.length;
      const percent = totalInWeek > 0 ? Math.round((completedInWeek / totalInWeek) * 100) : 0;

      groups.push({
        weekNumber: w,
        title: WEEK_TITLES[w] || `Week ${w}`,
        days: enrichedDays,
        completedCount: completedInWeek,
        totalCount: totalInWeek,
        percent,
      });
    }

    return groups;
  }, [days, deterministicPlan, upNextDayNumber]);

  // 4. Scroll-linked Spine Progress Calculation
  useEffect(() => {
    if (days.length === 0) return;

    const handleScroll = () => {
      const container = timelineContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;

      // Portion of timeline currently scrolled past the viewport mid-line
      const currentScroll = windowHeight * 0.5 - rect.top;
      const ratio = Math.max(0, Math.min(1, currentScroll / totalHeight));
      setScrollProgress(ratio);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [days]);

  // 5. Auto-scroll on initial load to "Up next" day
  useEffect(() => {
    if (!isLoading && upNextCardRef.current && !shouldReduceMotion) {
      const timer = setTimeout(() => {
        upNextCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isLoading, shouldReduceMotion]);

  const scrollToUpNext = () => {
    upNextCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  // Pre-filled completed ratio: spine is already filled at least up to the last completed day
  const baseCompletedFraction =
    lastCompletedIndex >= 0 ? (lastCompletedIndex + 1) / 30 : 0;
  const spineFillPercentage = Math.min(
    100,
    Math.max(baseCompletedFraction, scrollProgress) * 100
  );

  // Goal icon lookup
  const goalIcons: Record<string, React.ReactNode> = {
    fat_loss: <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    muscle_gain: <Dumbbell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    maintain: <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Loading Your Plan...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Retrieving 30-day program &amp; timeline
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

  // Empty State
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative">
      {/* 1. Header Profile Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 mb-10 relative overflow-hidden"
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
              Interactive Glass Timeline • Follow your structured journey step by step.
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

        {/* Global Progress Bar */}
        <div className="mt-6 w-full bg-slate-200/80 dark:bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-300/40 dark:border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 3)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full"
          />
        </div>
      </motion.div>

      {/* 2. Timeline Container */}
      <div ref={timelineContainerRef} className="relative pb-16">
        {/* The Central Glowing Glass Spine Line */}
        {/* On mobile: left-6. On desktop: left-1/2 -translate-x-1/2 */}
        <div className="absolute top-4 bottom-4 left-6 md:left-1/2 md:-translate-x-1/2 w-1 rounded-full bg-slate-200/80 dark:bg-slate-800/60 z-0">
          {/* Scroll-linked & Completed Luminous Fill Track */}
          <div
            className="w-full rounded-full bg-gradient-to-b from-emerald-400 via-indigo-500 to-cyan-400 transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
            style={{ height: `${spineFillPercentage}%` }}
          />
        </div>

        {/* 3. Weeks Grouping */}
        {weekGroups.map((week) => (
          <div key={week.weekNumber} className="relative mb-14">
            {/* Sticky Week Header */}
            <div className="sticky top-16 md:top-20 z-20 my-6">
              <div className="glass-panel backdrop-blur-md rounded-2xl px-5 py-3.5 border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    W{week.weekNumber}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {week.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {week.completedCount} of {week.totalCount} days completed
                    </p>
                  </div>
                </div>

                {/* Circular Week Progress Ring */}
                <div className="flex items-center space-x-2">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-indigo-600 dark:text-cyan-400 transition-all duration-500 ease-out"
                        strokeDasharray={`${week.percent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-800 dark:text-slate-200">
                      {week.percent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Days in This Week */}
            <div className="space-y-6 pt-2">
              {week.days.map((day) => {
                const isEven = (day.dayNumber % 2) === 1; // Alternating sides on desktop: Odd left, Even right
                const isCompleted = day.status === 'completed';
                const isUpNext = day.isUpNext;
                const isRest = day.isRest;

                return (
                  <motion.div
                    key={day.dayNumber}
                    ref={isUpNext ? upNextCardRef : null}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="relative flex items-center"
                  >
                    {/* Spine Node Anchor */}
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                      {isCompleted ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.6)] flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[2.8]" />
                        </div>
                      ) : isUpNext ? (
                        <div className="relative flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-indigo-500/40" />
                          <div className="w-9 h-9 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-[0_0_18px_rgba(99,102,241,0.8)] border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <Play className="w-4 h-4 fill-white translate-x-0.5" />
                          </div>
                        </div>
                      ) : isRest ? (
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Coffee className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        </div>
                      )}
                    </div>

                    {/* Timeline Day Card */}
                    <div
                      className={`w-full pl-16 md:pl-0 ${
                        isEven
                          ? 'md:w-[calc(50%-2.5rem)] md:mr-auto'
                          : 'md:w-[calc(50%-2.5rem)] md:ml-auto'
                      }`}
                    >
                      <Link
                        href={`/plan/${day.dayNumber}`}
                        className={`group block glass-panel rounded-2xl p-5 border transition-all duration-300 cursor-pointer ${
                          isUpNext
                            ? 'border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-950/25 shadow-[0_4px_24px_rgba(99,102,241,0.25)] hover:border-indigo-400 hover:shadow-[0_10px_32px_rgba(99,102,241,0.35)]'
                            : isCompleted
                            ? 'border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 hover:border-emerald-500 hover:shadow-[0_8px_24px_rgba(16,185,129,0.2)]'
                            : isRest
                            ? 'border-slate-200/80 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-white/20'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10'
                        }`}
                      >
                        {/* Card Header: Day number + Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                              Day {day.dayNumber}
                            </span>
                            {isUpNext && (
                              <span className="inline-flex items-center text-[10px] font-bold text-white bg-indigo-600 dark:bg-indigo-500 px-2 py-0.5 rounded-full shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 mr-1" />
                                Up Next
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          {isCompleted ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                              Completed
                            </span>
                          ) : isRest ? (
                            <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-full">
                              <Coffee className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Recovery
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Not Started
                            </span>
                          )}
                        </div>

                        {/* Workout Focus / Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                          {day.workoutType}
                        </h3>

                        {/* Exercise Name Chips (Workout Days Only) */}
                        {!isRest && day.exercises.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {day.exercises.slice(0, 4).map((exName, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300"
                              >
                                {exName}
                              </span>
                            ))}
                            {day.exercises.length > 4 && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                                +{day.exercises.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Rest Day Message */}
                        {isRest && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                            Active recovery, hydration, and light stretching. Muscles rebuild and adapt on rest days.
                          </p>
                        )}

                        {/* Card Footer: Exercise Count, Est Duration, Link Arrow */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center">
                              <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {isRest ? 'Rest Day' : `${day.exerciseCount} exercises`}
                            </span>
                            {!isRest && day.estimatedMinutes > 0 && (
                              <span className="inline-flex items-center text-slate-500 dark:text-slate-400">
                                <Timer className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                ~{day.estimatedMinutes} mins
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                            View Day
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </span>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Floating "Jump to Up next" Button */}
      {upNextDayNumber && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <button
            type="button"
            onClick={scrollToUpNext}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 transition-all border border-indigo-400/30 cursor-pointer active:scale-95"
            title={`Scroll to Day ${upNextDayNumber}`}
          >
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Jump to Up Next (Day {upNextDayNumber})</span>
            <ArrowDown className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
