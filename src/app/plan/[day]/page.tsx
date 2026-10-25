'use client';

// FitForm Single Workout Day Page (/plan/[day])
// Shows exercises, sets, reps, rest intervals, and the disabled 'Coming in Step 3' action button.

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
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-white">Loading Day {dayNumber}...</h2>
      </div>
    );
  }

  if (errorMessage || !dayData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Error Loading Workout</h2>
        <p className="text-sm text-slate-400 mb-6">{errorMessage || 'Workout not found.'}</p>
        <Link
          href="/plan"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
        >
          Return to 30-Day Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/plan"
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to 30-Day Plan</span>
        </Link>
      </div>

      {/* Day Header Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                Day {dayData.dayNumber} of 30
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Completed
                </span>
              ) : dayData.isRest ? (
                <span className="inline-flex items-center text-xs font-semibold text-slate-400 bg-slate-800/40 border border-white/10 px-2.5 py-0.5 rounded-full">
                  <Coffee className="w-3.5 h-3.5 mr-1" />
                  Rest Day
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  Scheduled Workout
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {dayData.workoutType}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Programmed for {userName}
            </p>
          </div>

          {/* Action button: Disabled "Coming in Step 3" */}
          <div>
            <button
              type="button"
              disabled
              title="Camera form checking will unlock in Step 3"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/60 border border-white/10 text-slate-400 text-sm font-semibold cursor-not-allowed opacity-80 shadow-inner"
            >
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Start Workout</span>
              <span className="text-[11px] font-normal text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md ml-1">
                Coming in Step 3
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Rest Day Content */}
      {dayData.isRest ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <Coffee className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Rest & Recovery Day</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
            Muscle repair, glycogen replenishment, and central nervous system recovery take place on rest days. Stay hydrated, take a gentle walk, and prioritize quality sleep.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-xs font-semibold text-white mb-1">Hydration</div>
              <div className="text-[11px] text-slate-400">Aim for 2.5 - 3.5 liters of clean water today.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-xs font-semibold text-white mb-1">Mobility</div>
              <div className="text-[11px] text-slate-400">10-15 minutes of dynamic stretching or foam rolling.</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-xs font-semibold text-white mb-1">Sleep</div>
              <div className="text-[11px] text-slate-400">8+ hours of uninterrupted sleep for maximum recovery.</div>
            </div>
          </div>
        </div>
      ) : (
        /* Exercises List */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Dumbbell className="w-5 h-5 text-indigo-400" />
              <span>Prescribed Exercises ({dayData.exercises.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Rest between sets as indicated</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {dayData.exercises.map((exercise, idx) => (
              <div
                key={exercise.id}
                className="glass-panel glass-panel-hover rounded-xl p-5 border border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Exercise info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 font-bold text-xs mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">{exercise.exerciseName}</h3>
                        {exercise.formTrackable ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Form check ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Form check coming later
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Target: <span className="text-slate-300">{exercise.targetMuscles}</span>
                      </p>
                    </div>
                  </div>

                  {/* Sets, Reps/Duration, Rest Metrics */}
                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    {/* Sets */}
                    <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 text-center min-w-[64px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                        <Layers className="w-3 h-3 mr-1 text-slate-400" />
                        Sets
                      </div>
                      <div className="text-sm font-bold text-white">{exercise.sets}</div>
                    </div>

                    {/* Reps or Duration */}
                    <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 text-center min-w-[76px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                        <Repeat className="w-3 h-3 mr-1 text-slate-400" />
                        {exercise.durationSecs ? 'Hold' : 'Reps'}
                      </div>
                      <div className="text-sm font-bold text-indigo-300">
                        {exercise.durationSecs ? `${exercise.durationSecs}s` : exercise.reps}
                      </div>
                    </div>

                    {/* Rest */}
                    <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 text-center min-w-[64px]">
                      <div className="flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                        <Timer className="w-3 h-3 mr-1 text-slate-400" />
                        Rest
                      </div>
                      <div className="text-sm font-bold text-cyan-300">{exercise.restSeconds}s</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
