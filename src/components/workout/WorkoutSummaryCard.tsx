'use client';

// src/components/workout/WorkoutSummaryCard.tsx
// FitForm Workout Completion Celebration Card
// Displayed when the final set of the workout day is logged.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smile,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface WorkoutSummaryData {
  dayNumber: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalHoldSeconds: number;
  averageFormScore: number | null;
  topMistakes: string[];
  totalWorkoutMinutes: number;
}

interface WorkoutSummaryCardProps {
  summary: WorkoutSummaryData;
  userId?: number;
  dayNumber?: number;
}

const RPE_OPTIONS = [
  { score: 1, label: 'Very Easy', emoji: '😌', color: 'border-emerald-400 text-emerald-600 dark:text-emerald-400' },
  { score: 2, label: 'Easy', emoji: '🙂', color: 'border-teal-400 text-teal-600 dark:text-teal-400' },
  { score: 3, label: 'Moderate', emoji: '💪', color: 'border-blue-400 text-blue-600 dark:text-blue-400' },
  { score: 4, label: 'Hard', emoji: '🔥', color: 'border-amber-400 text-amber-600 dark:text-amber-400' },
  { score: 5, label: 'Very Hard', emoji: '🥵', color: 'border-rose-400 text-rose-600 dark:text-rose-400' },
];

export default function WorkoutSummaryCard({ summary, userId: propUserId, dayNumber: propDayNumber }: WorkoutSummaryCardProps) {
  const [activeUserId, setActiveUserId] = useState<number | null>(propUserId || null);
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [skippedFeedback, setSkippedFeedback] = useState(false);

  const effectiveDay = propDayNumber || summary.dayNumber;

  useEffect(() => {
    if (!activeUserId) {
      const stored = localStorage.getItem('fitform_active_user_id');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) setActiveUserId(parsed);
      }
    }
  }, [activeUserId]);

  const handleRateWorkout = async (score: number) => {
    if (!activeUserId) return;
    setSelectedRpe(score);
    setIsSavingFeedback(true);
    setSkippedFeedback(false);

    try {
      const res = await fetch('/api/workout/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          dayNumber: effectiveDay,
          rpeScore: score,
        }),
      });
      if (res.ok) {
        setFeedbackSaved(true);
      }
    } catch (e) {
      console.error('Failed to save workout feedback:', e);
    } finally {
      setIsSavingFeedback(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto py-6"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border-2 border-indigo-500/30 bg-white/95 dark:bg-slate-900/95 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Celebration Header */}
        <div className="text-center pb-6 border-b border-slate-200/80 dark:border-white/10 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Day {summary.dayNumber} Complete!</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Workout Crushed!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            You completed every prescribed set for today. Here is your biometric breakdown:
          </p>
        </div>

        {/* 4 Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 relative z-10">
          {/* Total Sets */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {summary.totalSets}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              Sets Logged
            </div>
          </div>

          {/* Reps / Hold */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
              {summary.totalReps > 0 ? summary.totalReps : `${summary.totalHoldSeconds}s`}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              {summary.totalReps > 0 ? 'Total Reps' : 'Hold Time'}
            </div>
          </div>

          {/* Average Form Score */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-center">
            <div
              className={`text-2xl sm:text-3xl font-black ${
                summary.averageFormScore !== null
                  ? summary.averageFormScore >= 90
                    ? 'text-emerald-500'
                    : summary.averageFormScore >= 75
                    ? 'text-amber-500'
                    : 'text-red-500'
                  : 'text-slate-400'
              }`}
            >
              {summary.averageFormScore !== null ? `${Math.round(summary.averageFormScore)}%` : 'N/A'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              Avg Form Score
            </div>
          </div>

          {/* Workout Time */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
              {Math.max(1, summary.totalWorkoutMinutes)}m
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
              Workout Time
            </div>
          </div>
        </div>

        {/* Biomechanical Feedback Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 mb-6 relative z-10">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Technique Insights
          </div>

          {summary.topMistakes.length === 0 ? (
            <div className="flex items-center space-x-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Flawless technique across all live camera sets today!</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Key adjustments for your next session:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summary.topMistakes.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How did it feel? (RPE Survey) */}
        {!skippedFeedback && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/60 dark:border-indigo-500/20 mb-6 relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <Smile className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  How did today feel?
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSkippedFeedback(true)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Skip
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Rate your effort level to help dial in your training volume and recovery.
            </p>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {RPE_OPTIONS.map((opt) => {
                const isSelected = selectedRpe === opt.score;
                return (
                  <button
                    key={opt.score}
                    type="button"
                    disabled={isSavingFeedback}
                    onClick={() => handleRateWorkout(opt.score)}
                    className={`py-2 px-1 sm:px-2 rounded-xl text-center border transition-all cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-102 font-bold'
                        : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-base sm:text-lg mb-0.5">{opt.emoji}</div>
                    <div className="text-[10px] sm:text-[11px] font-semibold leading-tight line-clamp-1">
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {feedbackSaved && (
              <div className="mt-3 flex items-center justify-center space-x-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>Logged! Rest up.</span>
              </div>
            )}
          </div>
        )}

        {/* Return to Timeline Button */}
        <div className="relative z-10">
          <Link
            href="/plan"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-sm transition shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
          >
            <span>Return to 30-Day Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
