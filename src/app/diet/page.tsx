'use client';

// FitForm Diet by Budget Page Placeholder (/diet)
// Part of Step 2: Diet-by-budget recommendations, meal plans, and macro tracking.
// Upgraded with:
// - Framer Motion entrance & staggered feature preview cards.
// - High-contrast Light & Dark mode glassmorphism styling.

import React from 'react';
import Link from 'next/link';
import { Utensils, Sparkles, ArrowRight, DollarSign, Apple, HeartPulse } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export default function DietPage() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col items-center justify-center text-center"
    >
      {/* Icon Badge */}
      <motion.div
        variants={itemVariants}
        className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/10"
      >
        <Utensils className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </motion.div>

      {/* Step 2 Badge */}
      <motion.div variants={itemVariants}>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Coming in Step 2</span>
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        variants={itemVariants}
        className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4"
      >
        Diet &amp; Nutrition by Budget
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base mb-8"
      >
        We are building a smart nutrition engine that tailors high-protein meal plans and grocery lists to your weekly budget, whether student, budget-friendly, or premium.
      </motion.p>

      {/* Feature Preview Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10 text-left"
      >
        <motion.div
          whileHover={{ y: shouldReduceMotion ? 0 : -3 }}
          className="glass-panel glass-panel-hover rounded-xl p-5"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Budget Optimization</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Smart grocery estimates to hit your target calories and protein affordably.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: shouldReduceMotion ? 0 : -3 }}
          className="glass-panel glass-panel-hover rounded-xl p-5"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center mb-3 text-teal-600 dark:text-teal-400">
            <Apple className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Macro Balance</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Calculated carb, protein, and fat distributions customized for your goal.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: shouldReduceMotion ? 0 : -3 }}
          className="glass-panel glass-panel-hover rounded-xl p-5"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-600 dark:text-cyan-400">
            <HeartPulse className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Simple Prep</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Quick 15-minute healthy recipes designed for busy college students.
          </p>
        </motion.div>
      </motion.div>

      {/* Action to return to plan */}
      <motion.div variants={itemVariants}>
        <Link
          href="/plan"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-xl shadow-indigo-600/25 cursor-pointer"
        >
          <span>Explore Today&apos;s Workout</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
