'use client';

// src/components/progress/VolumeChart.tsx
// Displays Weekly Exercise Volume (Reps & Plank Seconds) and Workout Consistency
// Features:
// - Recharts BarChart comparing total reps and plank hold time
// - Completed vs Planned workout sessions indicator per week

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart2 } from 'lucide-react';

interface WeeklyVolumeItem {
  week: string;
  weekNumber: number;
  totalReps: number;
  totalPlankSeconds: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
}

interface VolumeChartProps {
  data: WeeklyVolumeItem[];
}

export default function VolumeChart({ data }: VolumeChartProps) {
  const [metric, setMetric] = useState<'reps' | 'workouts'>('reps');

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-4">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Weekly Volume & Consistency
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Training output and session completion across 5 program weeks
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetric('reps')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              metric === 'reps'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Reps & Holds
          </button>
          <button
            type="button"
            onClick={() => setMetric('workouts')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              metric === 'workouts'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Workouts Completed
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No volume recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {metric === 'reps' ? (
                <>
                  <Bar
                    dataKey="totalReps"
                    name="Exercise Reps"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="totalPlankSeconds"
                    name="Plank Hold (secs)"
                    fill="#06b6d4"
                    radius={[6, 6, 0, 0]}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="workoutsCompleted"
                    name="Workouts Completed"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="workoutsPlanned"
                    name="Workouts Planned"
                    fill="#cbd5e1"
                    radius={[6, 6, 0, 0]}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
