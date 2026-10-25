'use client';

// src/components/progress/StreakAndHeatmapCard.tsx
// Displays:
// 1. Current streak, longest streak, total workouts completed
// 2. Encouraging warning message when streak is at risk today
// 3. "This Week" 7-day status dots row
// 4. 30-Day Program Heatmap grid (colored by form score & status)

import React from 'react';
import { Flame, Trophy, CheckCircle2, AlertTriangle, Calendar, Moon } from 'lucide-react';
import { StreakAnalysisResult, WeekDayDot, ProgramHeatmapNode } from '@/lib/progress/streakCalculator';

interface StreakAndHeatmapCardProps {
  streak: StreakAnalysisResult;
}

export default function StreakAndHeatmapCard({ streak }: StreakAndHeatmapCardProps) {
  const {
    currentStreak,
    longestStreak,
    totalWorkoutsCompleted,
    isStreakAtRisk,
    streakAtRiskMessage,
    thisWeek,
    programHeatmap,
  } = streak;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6">
      {/* Top Headline Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current Streak */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Current Streak
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Longest Streak
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>

        {/* Total Workouts Completed */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Workouts Done
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalWorkoutsCompleted} Sessions
            </div>
          </div>
        </div>
      </div>

      {/* Streak At Risk Alert Banner */}
      {isStreakAtRisk && streakAtRiskMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Streak At Risk Today!</strong>
            <span>{streakAtRiskMessage}</span>
          </div>
        </div>
      )}

      {/* "This Week" 7-Day Dots Row */}
      <div className="pt-2">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          This Week
        </div>
        <div className="grid grid-cols-7 gap-2">
          {thisWeek.map((day: WeekDayDot, idx: number) => {
            const isDone = day.status === 'done';
            const isRest = day.status === 'rest';
            const isMissed = day.status === 'missed';

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-center border transition-all ${
                  day.isToday
                    ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 bg-white/90 dark:bg-slate-800'
                    : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/5'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {day.dayName}
                </div>
                <div className="flex justify-center">
                  {isDone ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isRest ? (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center">
                      <Moon className="w-3.5 h-3.5" />
                    </div>
                  ) : isMissed ? (
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-xs">
                      ✕
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600 flex items-center justify-center text-[10px]">
                      •
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 30-Day Program Heatmap */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              30-Day Program Heatmap
            </span>
          </div>

          {/* Color Legend */}
          <div className="flex items-center space-x-3 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>90%+</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-500" />
              <span>75-89%</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>&lt;75%</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700" />
              <span>Rest</span>
            </span>
          </div>
        </div>

        {/* 30-Day Heatmap Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
          {programHeatmap.map((node: ProgramHeatmapNode) => {
            const isDone = node.status === 'done';
            const isRest = node.isRest;
            const score = node.averageFormScore;

            let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5';

            if (isDone) {
              if (score !== null && score >= 90) {
                bgClass = 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20';
              } else if (score !== null && score >= 75) {
                bgClass = 'bg-teal-500 text-white border-teal-600 shadow-sm shadow-teal-500/20';
              } else {
                bgClass = 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20';
              }
            } else if (isRest) {
              bgClass = 'bg-slate-200/70 dark:bg-slate-800/60 text-slate-500 border-slate-300 dark:border-slate-700';
            } else if (node.status === 'missed') {
              bgClass = 'bg-rose-100 dark:bg-rose-950/40 text-rose-500 border-rose-300 dark:border-rose-900';
            }

            return (
              <div
                key={node.dayNumber}
                title={`Day ${node.dayNumber}: ${node.workoutType}${
                  score ? ` • Form Score: ${score}%` : isRest ? ' (Rest Day)' : ''
                }`}
                className={`p-2 rounded-xl border text-center transition hover:scale-105 cursor-pointer ${bgClass}`}
              >
                <div className="text-[10px] font-bold">D{node.dayNumber}</div>
                <div className="text-[9px] truncate font-medium">
                  {score !== null ? `${score}%` : isRest ? 'Rest' : node.status === 'missed' ? 'Miss' : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
