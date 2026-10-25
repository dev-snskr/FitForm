'use client';

// src/components/progress/PersonalRecordsCard.tsx
// Displays personal records per exercise with "New PR" tags and dates.

import React from 'react';
import { Award, Zap, Calendar, Dumbbell } from 'lucide-react';
import { PersonalRecord } from '@/lib/progress/metricsCalculator';

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
}

export default function PersonalRecordsCard({ records }: PersonalRecordsCardProps) {
  if (records.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 text-center">
        <Award className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          No Personal Records Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Log sets with reps or weight during your workouts to automatically track your all-time best performances.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Strength Milestones
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Personal Records (PRs)
            </h2>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {records.length} {records.length === 1 ? 'Exercise' : 'Exercises'} Tracked
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {records.map((pr, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 relative overflow-hidden transition-all hover:border-amber-500/30"
          >
            {pr.isNew && (
              <div className="absolute top-3 right-3 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>New PR</span>
              </div>
            )}

            <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              {pr.exercise}
            </div>

            <div className="flex items-baseline space-x-2 my-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {pr.bestReps}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">
                {pr.exercise.toLowerCase().includes('plank') ? 'Seconds' : 'Reps'}
              </span>

              {pr.bestLoadKg !== null && pr.bestLoadKg > 0 && (
                <div className="flex items-center space-x-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2 pl-2 border-l border-slate-200 dark:border-white/10">
                  <Dumbbell className="w-3 h-3 text-indigo-500" />
                  <span>{pr.bestLoadKg} kg</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              <Calendar className="w-3 h-3" />
              <span>Achieved {pr.achievedDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
