'use client';

// FitForm Interactive Workout Session Flow (/workout/[day])
// Walks through prescribed exercises set-by-set with:
// - Live camera MediaPipe squat checking (for Squat).
// - Manual logging fallback with "Form check coming soon" for non-squat exercises.
// - Disabled "Upload video" option ("Coming in Step 7").
// - Automatic log saving via POST /api/logs (syncing DB, JSON, CSV).
// - "Set complete" summary card with reps, form scores, and mistakes.
// - Day completion when all sets are logged.
// - Sets background component to 'static' mode for high performance.

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getStoredActiveUserId } from '@/lib/profileStorage';
import { useBackground } from '@/context/BackgroundContext';
import LiveSquatCamera from '@/components/pose/LiveSquatCamera';

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

interface SetCompleteSummary {
  exerciseName: string;
  setNumber: number;
  reps: number;
  formScore: number | null;
  mistakes: string[];
  mode: 'live_camera' | 'manual';
}

export default function WorkoutSessionPage() {
  const params = useParams();
  const router = useRouter();
  const dayNumber = params?.day as string;

  const { setMode } = useBackground();

  const [dayData, setDayData] = useState<WorkoutDayDetail | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Workout state machine
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [manualReps, setManualReps] = useState<number>(12);
  const [isSavingLog, setIsSavingLog] = useState<boolean>(false);
  const [completedSetSummary, setCompletedSetSummary] = useState<SetCompleteSummary | null>(null);
  const [isWorkoutFinished, setIsWorkoutFinished] = useState<boolean>(false);

  // Set background to static mode on this page for GPU efficiency
  useEffect(() => {
    setMode('static');
    return () => setMode('full');
  }, [setMode]);

  // Load day plan details
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
        setUserId(Number(activeId));

        const res = await fetch(`/api/plan?userId=${activeId}&day=${dayNumber}`);
        if (!res.ok) {
          throw new Error('Failed to load workout details');
        }

        const data = await res.json();
        if (data.day.isRest) {
          router.replace(`/plan/${dayNumber}`);
          return;
        }

        setDayData(data.day);
        setUserName(data.user?.name || 'Athlete');

        // Set default reps for first exercise
        if (data.day.exercises && data.day.exercises.length > 0) {
          setManualReps(data.day.exercises[0].reps || 12);
        }
      } catch (err: unknown) {
        console.error('Workout session load error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to initialize workout session'
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (dayNumber) {
      loadDay();
    }
  }, [dayNumber, router]);

  const currentExercise = useMemo<DayExerciseItem | null>(() => {
    if (!dayData || !dayData.exercises) return null;
    return dayData.exercises[currentExerciseIndex] || null;
  }, [dayData, currentExerciseIndex]);

  // Update manual reps input whenever exercise changes
  useEffect(() => {
    if (currentExercise) {
      setManualReps(currentExercise.reps || 12);
    }
  }, [currentExercise]);

  const isSquatExercise = useMemo(() => {
    if (!currentExercise) return false;
    const name = currentExercise.exerciseName.toLowerCase();
    return name.includes('squat');
  }, [currentExercise]);

  // Post a completed set log to the API
  const recordSetLog = async (
    reps: number,
    formScore: number | null,
    mistakes: string[],
    mode: 'live_camera' | 'manual'
  ) => {
    if (!currentExercise || !userId) return;

    setIsSavingLog(true);
    try {
      const payload = {
        userId,
        userName,
        dayNumber: Number(dayNumber),
        exercise: currentExercise.exerciseName,
        setNumber: currentSetNumber,
        reps,
        formScore,
        mistakes,
        restSeconds: currentExercise.restSeconds || 60,
        mode,
      };

      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save set log');
      }

      // Show Set Complete Card
      setCompletedSetSummary({
        exerciseName: currentExercise.exerciseName,
        setNumber: currentSetNumber,
        reps,
        formScore,
        mistakes,
        mode,
      });
      setIsCameraActive(false);
    } catch (err: unknown) {
      console.error('Error logging set:', err);
      alert('Could not save set log. Please try again.');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Live Camera set finished callback
  const handleCameraSetCompleted = (result: {
    reps: number;
    formScore: number;
    mistakes: string[];
  }) => {
    recordSetLog(result.reps, result.formScore, result.mistakes, 'live_camera');
  };

  // Manual set logged callback
  const handleManualSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordSetLog(manualReps, null, [], 'manual');
  };

  // Advance to next set or next exercise
  const handleAdvanceNextSet = () => {
    if (!dayData || !currentExercise) return;

    setCompletedSetSummary(null);

    // If more sets remain for this exercise
    if (currentSetNumber < currentExercise.sets) {
      setCurrentSetNumber((prev) => prev + 1);
    }
    // If more exercises remain in this day
    else if (currentExerciseIndex < dayData.exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSetNumber(1);
    }
    // Entire day is finished!
    else {
      setIsWorkoutFinished(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Preparing Workout Session...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Loading Day {dayNumber} exercises
        </p>
      </div>
    );
  }

  if (errorMessage || !dayData || !currentExercise) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Unable to Start Workout
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{errorMessage}</p>
        <Link
          href={`/plan/${dayNumber}`}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Return to Day Plan
        </Link>
      </div>
    );
  }

  // Celebratory Workout Finished View
  if (isWorkoutFinished) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel rounded-3xl p-8 sm:p-10 border border-emerald-500/30 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-500">
            <Trophy className="w-10 h-10" />
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            Day {dayNumber} Complete!
          </span>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-3 mb-2">
            Outstanding Workout!
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            All prescribed exercises and sets for Day {dayNumber} have been logged and synced. Your program timeline is updated!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/plan"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30"
            >
              <span>Back to Program Timeline</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href="/logs"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold"
            >
              <ClipboardList className="w-4 h-4" />
              <span>View Workout Logs</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Navigation & Day Progress Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/plan/${dayNumber}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Exit Workout</span>
        </Link>

        {/* Progress status */}
        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          <span>Exercise {currentExerciseIndex + 1} of {dayData.exercises.length}</span>
          <span>•</span>
          <span>Set {currentSetNumber} of {currentExercise.sets}</span>
        </div>
      </div>

      {/* Set Complete Modal / Card */}
      {completedSetSummary && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6 sm:p-8 border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 mb-8 shadow-xl"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Set #{completedSetSummary.setNumber} Complete!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {completedSetSummary.exerciseName} • Logged via{' '}
                {completedSetSummary.mode === 'live_camera' ? 'Live Camera' : 'Manual Entry'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 text-center">
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {completedSetSummary.reps}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                Reps Logged
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 text-center">
              <div
                className={`text-2xl font-black ${
                  completedSetSummary.formScore !== null
                    ? completedSetSummary.formScore >= 90
                      ? 'text-emerald-500'
                      : completedSetSummary.formScore >= 75
                      ? 'text-amber-500'
                      : 'text-red-500'
                    : 'text-slate-400'
                }`}
              >
                {completedSetSummary.formScore !== null ? `${completedSetSummary.formScore}%` : 'Not scored'}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                Form Score
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 text-center flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {completedSetSummary.mistakes.length === 0
                  ? 'Clean Form'
                  : `${completedSetSummary.mistakes.length} Correction(s)`}
              </div>
              <div className="text-[11px] text-slate-500 uppercase mt-0.5">
                Biomechanical Check
              </div>
            </div>
          </div>

          {/* Mistakes detected list */}
          {completedSetSummary.mistakes.length > 0 && (
            <div className="mb-6 p-3 rounded-xl bg-red-50/70 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300">
              <strong className="block mb-1">Form feedback notes:</strong>
              <ul className="list-disc list-inside space-y-0.5">
                {completedSetSummary.mistakes.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 italic">
              Rest timer coming in Step 4. Rest as needed.
            </span>
            <button
              type="button"
              onClick={handleAdvanceNextSet}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98"
            >
              <span>Next Set</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Live Camera Mode Active */}
      {isCameraActive && (
        <LiveSquatCamera
          onSetCompleted={handleCameraSetCompleted}
          onCancel={() => setIsCameraActive(false)}
          targetReps={currentExercise.reps || 12}
          setNumber={currentSetNumber}
        />
      )}

      {/* Regular Exercise Workspace View (when camera is not active and set is not just completed) */}
      {!isCameraActive && !completedSetSummary && (
        <div className="space-y-6">
          {/* Main Exercise Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    Day {dayNumber} • Exercise {currentExerciseIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Target Muscles: <strong className="text-slate-800 dark:text-slate-200">{currentExercise.targetMuscles}</strong>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {currentExercise.exerciseName}
                </h1>
              </div>

              {/* Set & Target Badges */}
              <div className="flex items-center space-x-3">
                <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-center min-w-[80px]">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Set</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    #{currentSetNumber} / {currentExercise.sets}
                  </div>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-center min-w-[80px]">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Goal Reps</div>
                  <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                    {currentExercise.durationSecs ? `${currentExercise.durationSecs}s` : currentExercise.reps}
                  </div>
                </div>
              </div>
            </div>

            {/* Check My Form Section */}
            <div className="py-6 border-b border-slate-200/80 dark:border-white/10">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Check My Form (AI Camera)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Live Camera Option */}
                {isSquatExercise ? (
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="p-5 rounded-2xl border-2 border-indigo-500/50 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 transition-all text-left group cursor-pointer shadow-md hover:shadow-indigo-500/20 active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Live Ready
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                      Live Camera Form Check
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Real-time side-on pose tracking with automatic rep counting and depth scoring.
                    </p>
                  </button>
                ) : (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/30 text-left opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Step 3: Squat Only
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-500 dark:text-slate-400">
                      Form Check Coming Soon
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Live camera for {currentExercise.exerciseName} will unlock in upcoming steps. Log reps manually below.
                    </p>
                  </div>
                )}

                {/* Video Upload Option (Disabled - Coming in Step 7) */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/30 text-left opacity-60 cursor-not-allowed">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
                      Coming in Step 7
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-500 dark:text-slate-400">
                    Upload Workout Video
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Side-by-side video upload comparison against ideal technique.
                  </p>
                </div>
              </div>
            </div>

            {/* Manual Set Logging Section */}
            <div className="pt-6">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Log Set Manually
              </h2>

              <form onSubmit={handleManualSetSubmit} className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-3">
                  <label htmlFor="repsInput" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reps Completed:
                  </label>
                  <input
                    id="repsInput"
                    type="number"
                    min={1}
                    max={100}
                    value={manualReps}
                    onChange={(e) => setManualReps(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 glass-input rounded-xl px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {isSavingLog ? 'Saving Log...' : `Log Set #${currentSetNumber}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
