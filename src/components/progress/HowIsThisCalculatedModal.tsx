'use client';

// src/components/progress/HowIsThisCalculatedModal.tsx
// Educational modal explaining all progress calculations in plain beginner language.

import React from 'react';
import { X, HelpCircle, CheckCircle, Flame, Dumbbell, Activity, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HowIsThisCalculatedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowIsThisCalculatedModal({
  isOpen,
  onClose,
}: HowIsThisCalculatedModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  How FitForm Calculates Your Data
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transparent, science-backed formulas explained in plain English.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Explanations List */}
          <div className="py-6 space-y-6 text-xs text-slate-600 dark:text-slate-300">
            {/* 1. Consistency & Adherence */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>1. Workout Consistency %</span>
              </div>
              <p className="leading-relaxed">
                We compare the number of scheduled workout sessions you completed against the total number of planned workout days up to today. Planned rest days are protected and never penalize your score or break your streak!
              </p>
              <div className="mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 inline-block">
                Consistency % = (Completed Workouts ÷ Planned Workouts) × 100
              </div>
            </div>

            {/* 2. Strength Volume & PRs */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                <Dumbbell className="w-4 h-4 text-indigo-500" />
                <span>2. Strength Volume & Personal Records (PRs)</span>
              </div>
              <p className="leading-relaxed">
                Tonnage or training volume measures mechanical work. When you use external weights, it calculates as reps multiplied by weight (kg). For bodyweight movements, your total reps are counted directly. Your Personal Record (PR) automatically updates whenever you log a new high for reps or weight on any exercise.
              </p>
              <div className="mt-2 text-[11px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 inline-block">
                Volume = Reps × Load (kg) &nbsp;|&nbsp; Bodyweight = Reps
              </div>
            </div>

            {/* 3. Form Mastery & Error Trends */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span>3. Form Mastery & Error Shifts</span>
              </div>
              <p className="leading-relaxed">
                During camera sets, our real-time computer vision engine grades joint alignment and range of motion from 0 to 100%. Once you complete at least 3 sessions, we split your training history into an earlier half and a recent half to verify whether specific mistakes (like knees caving or leaning) are decreasing over time.
              </p>
            </div>

            {/* 4. Estimated Calories */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>4. Estimated Calories (Compendium METs)</span>
              </div>
              <p className="leading-relaxed">
                Caloric burn is calculated using peer-reviewed Metabolic Equivalent of Task (MET) values from the <em>Compendium of Physical Activities</em>. For example, calisthenics and squats burn roughly 4.5 to 5.5 METs. Because individual metabolism varies with body composition and genetics, these numbers are always explicitly labeled as estimates.
              </p>
              <div className="mt-2 text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 inline-block">
                Calories = MET × Bodyweight (kg) × Workout Duration (hours)
              </div>
            </div>

            {/* 5. Goal Projections & Safety Pacing */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>5. Projected Goal Date & Healthy Pacing</span>
              </div>
              <p className="leading-relaxed">
                To prevent wild fluctuations from daily water weight, we require a minimum of 3 weigh-ins across at least 7 days before projecting a finish date. If your rate of weight change exceeds 1% of your bodyweight per week, we show a friendly pacing warning to ensure your fat loss or muscle gain remains healthy and sustainable.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 text-right">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
