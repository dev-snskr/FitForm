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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  Volume2,
} from 'lucide-react';
import { getStoredActiveUserId } from '@/lib/profileStorage';
import { useBackground } from '@/context/BackgroundContext';
import LiveExerciseCamera from '@/components/pose/LiveExerciseCamera';
import { isExerciseFormTrackable } from '@/lib/pose/analyzers/registry';
import RestTimerScreen from '@/components/workout/RestTimerScreen';
import WorkoutSummaryCard, { WorkoutSummaryData } from '@/components/workout/WorkoutSummaryCard';
import VoiceSettingsModal from '@/components/voice/VoiceSettingsModal';
import BadgeUnlockModal, { UnlockedBadgeInfo } from '@/components/progress/BadgeUnlockModal';

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
  const [isWorkoutFinished, setIsWorkoutFinished] = useState<boolean>(false);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [lastLoggedLogId, setLastLoggedLogId] = useState<number | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [unlockedBadge, setUnlockedBadge] = useState<UnlockedBadgeInfo | null>(null);

  // Accumulated workout session statistics for final summary
  const sessionStatsRef = useRef<{
    workoutStartMs: number;
    totalSets: number;
    totalReps: number;
    totalHoldSeconds: number;
    formScores: number[];
    mistakes: Set<string>;
  }>({
    workoutStartMs: Date.now(),
    totalSets: 0,
    totalReps: 0,
    totalHoldSeconds: 0,
    formScores: [],
    mistakes: new Set(),
  });

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

  const isFormCheckEnabled = useMemo(() => {
    if (!currentExercise) return false;
    return isExerciseFormTrackable(currentExercise.exerciseName);
  }, [currentExercise]);

  // Post a completed set log to the API
  const recordSetLog = async (
    reps: number,
    formScore: number | null,
    mistakes: string[],
    mode: 'live_camera' | 'manual',
    durationSeconds?: number | null
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
        durationSeconds: durationSeconds ?? null,
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

      const logData = await res.json();
      const createdId = logData.log?.id;
      setLastLoggedLogId(createdId || null);

      // Check for newly unlocked badge celebration
      if (logData.newlyEarnedBadges && logData.newlyEarnedBadges.length > 0) {
        setUnlockedBadge(logData.newlyEarnedBadges[0]);
      }

      // Accumulate session stats for final summary
      const stats = sessionStatsRef.current;
      stats.totalSets += 1;
      stats.totalReps += reps;
      stats.totalHoldSeconds += durationSeconds || 0;
      if (formScore !== null && formScore !== undefined) {
        stats.formScores.push(formScore);
      }
      if (mistakes && mistakes.length > 0) {
        mistakes.forEach((m) => stats.mistakes.add(m));
      }

      setIsCameraActive(false);

      // Check if this was the last set of the workout
      const isFinalSet =
        Boolean(dayData) &&
        currentExerciseIndex === dayData!.exercises.length - 1 &&
        currentSetNumber === currentExercise.sets;

      if (isFinalSet) {
        setIsWorkoutFinished(true);
      } else {
        // Activate Rest Timer screen
        setIsResting(true);
      }
    } catch (err: unknown) {
      console.error('Error logging set:', err);
      alert('Could not save set log. Please try again.');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Next set calculation for rest screen
  const nextSetInfo = useMemo(() => {
    if (!dayData || !currentExercise) {
      return { name: '', setNum: 1, totalSets: 1, restSeconds: 60 };
    }
    if (currentSetNumber < currentExercise.sets) {
      return {
        name: currentExercise.exerciseName,
        setNum: currentSetNumber + 1,
        totalSets: currentExercise.sets,
        restSeconds: currentExercise.restSeconds || 60,
      };
    }
    const nextIdx = currentExerciseIndex + 1;
    const nextEx = dayData.exercises[nextIdx] || currentExercise;
    return {
      name: nextEx.exerciseName,
      setNum: 1,
      totalSets: nextEx.sets,
      restSeconds: nextEx.restSeconds || 60,
    };
  }, [dayData, currentExercise, currentExerciseIndex, currentSetNumber]);

  // Callback when rest finishes or is skipped
  const handleFinishRest = async (actualSecondsRested: number) => {
    // Save actual rest duration to DB via PATCH /api/logs
    if (lastLoggedLogId) {
      try {
        await fetch('/api/logs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logId: lastLoggedLogId,
            restSeconds: actualSecondsRested,
          }),
        });
      } catch (err) {
        console.error('Failed to update actual rest duration:', err);
      }
    }

    if (!dayData || !currentExercise) return;

    // Advance set pointers
    if (currentSetNumber < currentExercise.sets) {
      setCurrentSetNumber((prev) => prev + 1);
    } else if (currentExerciseIndex < dayData.exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSetNumber(1);
    }

    setIsResting(false);
  };

  // Live Camera set finished callback
  const handleCameraSetCompleted = (result: {
    reps: number;
    durationSeconds?: number | null;
    formScore: number;
    mistakes: string[];
  }) => {
    recordSetLog(
      result.reps,
      result.formScore,
      result.mistakes,
      'live_camera',
      result.durationSeconds
    );
  };

  // Manual set logged callback
  const handleManualSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentExercise?.durationSecs) {
      recordSetLog(0, null, [], 'manual', manualReps);
    } else {
      recordSetLog(manualReps, null, [], 'manual', null);
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

  // Celebratory Workout Finished View (Rich Summary Card)
  if (isWorkoutFinished) {
    const stats = sessionStatsRef.current;
    const avgScore =
      stats.formScores.length > 0
        ? stats.formScores.reduce((a: number, b: number) => a + b, 0) / stats.formScores.length
        : null;

    const summaryData: WorkoutSummaryData = {
      dayNumber: Number(dayNumber),
      totalExercises: dayData?.exercises?.length || 0,
      totalSets: stats.totalSets,
      totalReps: stats.totalReps,
      totalHoldSeconds: stats.totalHoldSeconds,
      averageFormScore: avgScore,
      topMistakes: (Array.from(stats.mistakes) as string[]).slice(0, 4),
      totalWorkoutMinutes: Math.max(
        1,
        Math.round((Date.now() - stats.workoutStartMs) / 60000)
      ),
    };

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Voice & Sound Settings Modal */}
        <VoiceSettingsModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          userId={userId}
        />

        {/* Badge Celebration Modal */}
        <BadgeUnlockModal
          badge={unlockedBadge}
          onClose={() => setUnlockedBadge(null)}
        />

        <WorkoutSummaryCard summary={summaryData} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Voice & Sound Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        userId={userId}
      />

      {/* Badge Celebration Modal */}
      <BadgeUnlockModal
        badge={unlockedBadge}
        onClose={() => setUnlockedBadge(null)}
      />

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
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Exercise {currentExerciseIndex + 1} of {dayData.exercises.length}</span>
            <span>•</span>
            <span>Set {currentSetNumber} of {currentExercise.sets}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-sm cursor-pointer"
            title="Voice & Sound Settings"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Camera Mode Active */}
      {isCameraActive && currentExercise && (
        <LiveExerciseCamera
          exerciseName={currentExercise.exerciseName}
          onSetCompleted={handleCameraSetCompleted}
          onCancel={() => setIsCameraActive(false)}
          targetReps={currentExercise.reps || 12}
          targetDurationSecs={currentExercise.durationSecs}
          setNumber={currentSetNumber}
        />
      )}

      {/* Rest Timer Active */}
      {isResting && !isCameraActive && (
        <RestTimerScreen
          currentSetLogId={lastLoggedLogId}
          recommendedRestSeconds={nextSetInfo.restSeconds}
          nextExerciseName={nextSetInfo.name}
          nextSetNumber={nextSetInfo.setNum}
          nextTotalSets={nextSetInfo.totalSets}
          userId={userId}
          onFinishRest={handleFinishRest}
        />
      )}

      {/* Regular Exercise Workspace View (when neither camera nor rest is active) */}
      {!isCameraActive && !isResting && (
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
                {isFormCheckEnabled ? (
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
                      Real-time side-on pose tracking with automatic rep counting and form scoring.
                    </p>
                  </button>
                ) : (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/30 text-left opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Form Check Coming Soon
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
