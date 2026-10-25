'use client';

// FitForm Diet by Budget Page Placeholder (/diet)
// Part of Step 2: Diet-by-budget recommendations, meal plans, and macro tracking.

import React from 'react';
import Link from 'next/link';
import { Utensils, Sparkles, ArrowRight, DollarSign, Apple, HeartPulse } from 'lucide-react';

export default function DietPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col items-center justify-center text-center">
      {/* Icon Badge */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600/30 via-teal-500/20 to-cyan-500/30 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
        <Utensils className="w-10 h-10 text-emerald-400" />
      </div>

      {/* Title */}
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>Coming in Step 2</span>
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
        Diet &amp; Nutrition by Budget
      </h1>

      <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base mb-8">
        We are building a smart nutrition engine that tailors high-protein meal plans and grocery lists to your weekly budget, whether student, budget-friendly, or premium.
      </p>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10 text-left">
        <div className="glass-panel rounded-xl p-5 border border-white/10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Budget Optimization</h3>
          <p className="text-xs text-slate-400">
            Smart grocery estimates to hit your target calories and protein affordably.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-white/10">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mb-3 text-teal-400">
            <Apple className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Macro Balance</h3>
          <p className="text-xs text-slate-400">
            Calculated carb, protein, and fat distributions customized for your goal.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-white/10">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-400">
            <HeartPulse className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Simple Prep</h3>
          <p className="text-xs text-slate-400">
            Quick 15-minute healthy recipes designed for busy college students.
          </p>
        </div>
      </div>

      {/* Action to return to plan */}
      <Link
        href="/plan"
        className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-xl shadow-indigo-600/30"
      >
        <span>Explore Today&apos;s Workout</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
