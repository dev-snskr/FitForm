'use client';

// src/components/progress/ProfileCompletionCard.tsx
// Dismissible card inviting user to add target weight & waist circumference
// for accurate progress calculations and goal projections.

import React, { useState } from 'react';
import { Target, X, Check, ArrowRight } from 'lucide-react';

interface ProfileCompletionCardProps {
  userId: number;
  initialTargetWeight?: number | null;
  initialWaist?: number | null;
  onSaved: () => void;
}

export default function ProfileCompletionCard({
  userId,
  initialTargetWeight,
  initialWaist,
  onSaved,
}: ProfileCompletionCardProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`fitform_dismiss_profile_prompt_${userId}`) === 'true';
  });

  const [targetWeight, setTargetWeight] = useState(
    initialTargetWeight ? String(initialTargetWeight) : ''
  );
  const [waist, setWaist] = useState(initialWaist ? String(initialWaist) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If both values are already present or card was dismissed, don't show
  if (isDismissed || (initialTargetWeight && initialWaist)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`fitform_dismiss_profile_prompt_${userId}`, 'true');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const body: { id: number; targetWeightKg?: number; waistCm?: number } = { id: userId };

    if (targetWeight.trim()) {
      const numTarget = parseFloat(targetWeight);
      if (isNaN(numTarget) || numTarget < 30 || numTarget > 250) {
        setErrorMsg('Target weight must be between 30 and 250 kg.');
        return;
      }
      body.targetWeightKg = Number(numTarget.toFixed(1));
    }

    if (waist.trim()) {
      const numWaist = parseFloat(waist);
      if (isNaN(numWaist) || numWaist < 40 || numWaist > 200) {
        setErrorMsg('Waist measurement must be between 40 and 200 cm.');
        return;
      }
      body.waistCm = Number(numWaist.toFixed(1));
    }

    if (!body.targetWeightKg && !body.waistCm) {
      setErrorMsg('Please enter a target weight or waist measurement to save.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 700);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-indigo-500/30 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 relative overflow-hidden mb-8 shadow-sm">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        title="Dismiss prompt"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start space-x-3.5 pr-8">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Profile Enhancement
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Complete your body metrics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Add an optional target weight and waist circumference. FitForm uses these to project your goal achievement date and track body composition changes.
          </p>

          <form onSubmit={handleSave} className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                placeholder="Target weight (kg)"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs font-semibold w-40 text-left focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 pointer-events-none">
                kg
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="40"
                max="200"
                placeholder="Waist (cm)"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs font-semibold w-36 text-left focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 pointer-events-none">
                cm
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving || success}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {success ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <span>Save Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <p className="text-xs text-rose-500 font-medium mt-2">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
