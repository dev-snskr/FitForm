'use client';

// src/components/progress/WeightChart.tsx
// Displays Bodyweight Progression Over Time
// Features:
// - Starting vs current weight delta calculation ("-2.1 kg")
// - Recharts line graph with smooth curve
// - "Log Today's Weight" input (30-250 kg validation, 1 entry/day)
// - "Export JSON" button for weight data

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Scale, Download, Plus, Check } from 'lucide-react';

interface WeightEntryItem {
  date: string;
  weightKg: number;
}

interface WeightChartProps {
  userId: number;
  startWeight: number;
  currentWeight: number;
  weightDelta: number;
  entries: WeightEntryItem[];
  onWeightLogged: () => void;
}

export default function WeightChart({
  userId,
  startWeight,
  currentWeight,
  weightDelta,
  entries,
  onWeightLogged,
}: WeightChartProps) {
  const [newWeightInput, setNewWeightInput] = useState<string>(currentWeight ? String(currentWeight) : '75');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val < 30 || val > 250) {
      setErrorMessage('Weight must be between 30 and 250 kg');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weightKg: val,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record weight');
      }

      setSuccessMessage('Weight logged successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      onWeightLogged();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save weight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportJson = () => {
    window.open(`/api/weight?userId=${userId}&format=json`, '_blank');
  };

  const deltaSign = weightDelta > 0 ? `+${weightDelta}` : `${weightDelta}`;
  const isLoss = weightDelta < 0;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Bodyweight Tracking
              </h2>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  isLoss
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : weightDelta === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {deltaSign} kg
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Start: {startWeight} kg • Current: {currentWeight} kg
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        {entries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No weight entries logged yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={entries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                unit="kg"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: unknown) => [`${String(val ?? 0)} kg`, 'Weight']}
              />
              <Line
                type="monotone"
                dataKey="weightKg"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* "Log Today's Weight" Form */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
        <form onSubmit={handleLogWeight} className="flex flex-wrap items-center gap-3">
          <label htmlFor="weightInput" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Log today&apos;s weight:
          </label>
          <div className="relative">
            <input
              id="weightInput"
              type="number"
              step="0.1"
              min="30"
              max="250"
              value={newWeightInput}
              onChange={(e) => setNewWeightInput(e.target.value)}
              className="w-28 glass-input rounded-xl px-3 py-1.5 text-xs font-bold text-center focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. 74.5"
            />
            <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 pointer-events-none">
              kg
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save Weight'}</span>
          </button>

          {successMessage && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>{successMessage}</span>
            </span>
          )}

          {errorMessage && (
            <span className="text-xs text-rose-500 font-semibold">{errorMessage}</span>
          )}
        </form>
      </div>
    </div>
  );
}
