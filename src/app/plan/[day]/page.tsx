'use client';

// FitForm Single Workout Day Page (/plan/[day])
// Upgraded with:
// - Framer Motion slide-in and staggered exercise animations.
// - High-contrast Light & Dark mode styling across headers, badges, and metric chips.
// - Micro-interactions on buttons and exercise cards.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Dumbbell,
  Timer,
  Repeat,
  Layers,
  Lock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getStoredActiveUserId } from '@/lib/profileStorage';

interface DayExerciseItem {
  id: number;
  exerciseName: string;
  targetMuscles: string;
  sets: number;
  reps: number;
  durationSecs: number | null;
  restSeconds: number;
  formTrackable: boolean;
  orderIndex: number;
}

interface WorkoutDayDetail {
  id: number;
  dayNumber: number;
  workoutType: string;
  isRest: boolean;
  exercises: DayExerciseItem[];
}

export default function DayPlanPage() {
  const params = useParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const dayNumber = params?.day as string;

  const [dayData, setDayData] = useState<WorkoutDayDetail | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDay() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const activeId = getStoredActiveUserId();
        if (!activeId) {
          router.replace('/plan');
          return;
        }

        const res = await fetch(`/api/plan?userId=${activeId}&day=${dayNumber}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Day ${dayNumber} was not found in your 30-day program.`);
          }
          throw new Error('Failed to load workout details.');
        }

        const data = await res.json();
        setDayData(data.day);
        setUserName(data.user?.name || '');
        setIsCompleted(data.isCompleted || false);
      } catch (err: unknown) {
        console.error('Day plan error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'An error occurred while loading this day.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (dayNumber) {
      loadDay();
    }
  }, [dayNumber, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Loading Day {dayNumber}...
        </h2>
      </div>
    );
  }

  if (errorMessage || !dayData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Workout</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{errorMessage || 'Workout not found.'}</p>
        <Link
          href="/plan"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition cursor-pointer"
        >
          Return to 30-Day Plan
        </Link>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Link
          href="/plan"
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to 30-Day Plan</span>
        </Link>
      </motion.div>

      {/* Day Header Card */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                Day {dayData.dayNumber} of 30
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Completed
                </span>
              ) : dayData.isRest ? (
                <span className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 rounded-full">
                  <Coffee className="w-3.5 h-3.5 mr-1" />
                  Rest Day
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  Scheduled Workout
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {dayData.workoutType}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Programmed for {userName}
            </p>
          </div>

          {/* Action button: Disabled "Coming in Step 3" */}
          <div>
            <button
              type="button"
              disabled
              title="Camera form checking will unlock in Step 3"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-sm font-semibold cursor-not-allowed shadow-inner"
            >
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Start Workout</span>
              <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-md ml-1">
                Coming in Step 3
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Rest Day Content */}
      {dayData.isRest ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-panel rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
            <Coffee className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Rest &amp; Recovery Day</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-6">
            Muscle repair, glycogen replenishment, and central nervous system recovery take place on rest days. Stay hydrated, take a gentle walk, and prioritize quality sleep.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">Hydration</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Aim for 2.5 - 3.5 liters of clean water today.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">Mobility</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">10-15 minutes of dynamic stretching or foam rolling.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5">
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">Sleep</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">8+ hours of uninterrupted sleep for maximum recovery.</div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Exercises List */
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Dumbbell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Prescribed Exercises ({dayData.exercises.length})</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Rest between sets as indicated</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {dayData.exercises.map((exercise, idx) => (
              <motion.div
                key={exercise.id}
                variants={itemVariants}
                whileHover={{ y: shouldReduceMotion ? 0 : -2 }}
                className="glass-panel glass-panel-hover rounded-xl p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Exercise info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-700 dark:text-indigo-300 font-bold text-xs mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {exercise.exerciseName}
                        </h3>
                        {exercise.formTrackable ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Form check ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                            Form check coming later
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Target: <span className="font-medium text-slate-800 dark:text-slate-300">{exercise.targetMuscles}</span>
                      </p>
                    </div>
                  </div>

                  {/* Sets, Reps/Duration, Rest Metrics */}
                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    {/* Sets */}
                    <div className="px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-center min-w-[64px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        <Layers className="w-3 h-3 mr-1 text-slate-400" />
                        Sets
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{exercise.sets}</div>
                    </div>

                    {/* Reps or Duration */}
                    <div className="px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-center min-w-[76px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        <Repeat className="w-3 h-3 mr-1 text-slate-400" />
                        {exercise.durationSecs ? 'Hold' : 'Reps'}
                      </div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-300">
                        {exercise.durationSecs ? `${exercise.durationSecs}s` : exercise.reps}
                      </div>
                    </div>

                    {/* Rest */}
                    <div className="px-3 py-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-center min-w-[64px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                        <Timer className="w-3 h-3 mr-1 text-slate-400" />
                        Rest
                      </div>
                      <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300">{exercise.restSeconds}s</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
