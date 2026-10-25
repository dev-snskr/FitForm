'use client';

// src/components/progress/MistakesBreakdownChart.tsx
// Displays Most Frequent Biomechanical Form Mistakes (Horizontal Bar Chart)
// Features:
// - Recharts BarChart with layout="vertical"
// - Plain-language coaching tip card targeting the #1 most recurring mistake

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AlertCircle, Lightbulb, CheckCircle2 } from 'lucide-react';

interface MistakeItem {
  mistake: string;
  count: number;
}

interface MistakesBreakdownChartProps {
  mistakes: MistakeItem[];
  topMistakeTip: string | null;
}

export default function MistakesBreakdownChart({
  mistakes,
  topMistakeTip,
}: MistakesBreakdownChartProps) {
  const topMistake = mistakes[0]?.mistake || null;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 text-rose-500" />
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Biomechanical Form Feedback
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Most frequent technique cues flagged by camera tracking
          </p>
        </div>
      </div>

      {mistakes.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Flawless Form!
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Zero form errors detected in your recorded sets. Keep maintaining crisp biomechanics!
          </p>
        </div>
      ) : (
        <>
          {/* Top Focus Coaching Tip Banner */}
          {topMistake && topMistakeTip && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 flex items-start space-x-3 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-indigo-900 dark:text-indigo-200 font-bold mb-0.5">
                  Coach Focus: &quot;{topMistake}&quot;
                </strong>
                <p className="text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                  {topMistakeTip}
                </p>
              </div>
            </div>
          )}

          {/* Horizontal Bar Chart */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={mistakes.slice(0, 5)}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis
                  dataKey="mistake"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [`${String(val ?? 0)} times flagged`, 'Frequency']}
                />
                <Bar
                  dataKey="count"
                  fill="#f43f5e"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
