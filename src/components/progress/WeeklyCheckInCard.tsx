'use client';

// src/components/progress/WeeklyCheckInCard.tsx
// Body measurements & weekly weight check-in modal/card with history.

import React, { useState } from 'react';
import { Scale, Check, Plus, ChevronDown, ChevronUp, History, Sparkles } from 'lucide-react';

export interface BodyMeasurementEntry {
  id?: number;
  date: string;
  weightKg: number;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  armCm?: number | null;
}

interface WeeklyCheckInCardProps {
  userId: number;
  currentWeightKg: number;
  entries: BodyMeasurementEntry[];
  onCheckInLogged: () => void;
}

export default function WeeklyCheckInCard({
  userId,
  currentWeightKg,
  entries,
  onCheckInLogged,
}: WeeklyCheckInCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form states
  const [weight, setWeight] = useState(String(currentWeightKg || ''));
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const [arm, setArm] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight < 30 || numWeight > 250) {
      setErrorMsg('Weight must be a valid number between 30 and 250 kg.');
      return;
    }

    const payload: {
      userId: number;
      weightKg: number;
      waistCm?: number;
      chestCm?: number;
      hipsCm?: number;
      armCm?: number;
    } = {
      userId,
      weightKg: Number(numWeight.toFixed(1)),
    };

    if (waist.trim()) {
      const numWaist = parseFloat(waist);
      if (isNaN(numWaist) || numWaist < 40 || numWaist > 200) {
        setErrorMsg('Waist must be between 40 and 200 cm.');
        return;
      }
      payload.waistCm = Number(numWaist.toFixed(1));
    }

    if (chest.trim()) {
      const numChest = parseFloat(chest);
      if (isNaN(numChest) || numChest < 40 || numChest > 200) {
        setErrorMsg('Chest must be between 40 and 200 cm.');
        return;
      }
      payload.chestCm = Number(numChest.toFixed(1));
    }

    if (hips.trim()) {
      const numHips = parseFloat(hips);
      if (isNaN(numHips) || numHips < 40 || numHips > 200) {
        setErrorMsg('Hips must be between 40 and 200 cm.');
        return;
      }
      payload.hipsCm = Number(numHips.toFixed(1));
    }

    if (arm.trim()) {
      const numArm = parseFloat(arm);
      if (isNaN(numArm) || numArm < 15 || numArm > 70) {
        setErrorMsg('Arm must be between 15 and 70 cm.');
        return;
      }
      payload.armCm = Number(numArm.toFixed(1));
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record check-in');
      }

      setSuccessMsg('Check-in logged successfully! Today’s biometrics updated.');
      setTimeout(() => {
        setSuccessMsg(null);
        setIsOpen(false);
        onCheckInLogged();
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error logging check-in');
    } finally {
      setIsSaving(false);
    }
  };

  // Sort history newest first
  const historyList = [...entries].reverse().slice(0, 5);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                Body Composition
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold">
                Weekly Check-in
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              Current Weight: <span className="text-cyan-600 dark:text-cyan-400">{currentWeightKg} kg</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track weight and tape measurements weekly to observe lean muscle gain or fat loss.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({entries.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Check-in</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Check-in Form Expandable */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Record Today’s Biometrics</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Weight is required. Tape measurements (waist, chest, hips, arm) are optional but help track muscle reshaping.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Weight */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75.0"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-center focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Waist */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Waist (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="200"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="Optional"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-center focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Chest */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chest (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="200"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                placeholder="Optional"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-center focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Hips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hips (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="200"
                value={hips}
                onChange={(e) => setHips(e.target.value)}
                placeholder="Optional"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-center focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Arm */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Arm (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min="15"
                max="70"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                placeholder="Optional"
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-center focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {errorMsg ? (
              <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
            ) : successMsg ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            ) : (
              <span className="text-[11px] text-slate-400">
                Entries for today will update today’s existing record.
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Check-in'}
            </button>
          </div>
        </form>
      )}

      {/* History Expandable */}
      {showHistory && (
        <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-white/10">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
            Recent Check-in Logs
          </h4>
          {historyList.length === 0 ? (
            <p className="text-xs text-slate-400">No check-in history found.</p>
          ) : (
            <div className="space-y-2">
              {historyList.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs"
                >
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {entry.date}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      {entry.weightKg} kg
                    </span>
                    {entry.waistCm && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Waist: {entry.waistCm} cm
                      </span>
                    )}
                    {entry.chestCm && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Chest: {entry.chestCm} cm
                      </span>
                    )}
                    {entry.hipsCm && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Hips: {entry.hipsCm} cm
                      </span>
                    )}
                    {entry.armCm && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Arm: {entry.armCm} cm
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
