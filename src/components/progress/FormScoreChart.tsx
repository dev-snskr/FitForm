'use client';

// src/components/progress/FormScoreChart.tsx
// Displays Form Score Progression Over Time using Recharts
// Features:
// - Overall workout day average scores with smooth trend line
// - Per-exercise dropdown filter (Squat, Push-Up, Bicep Curl, Lunge, Plank, All)
// - Theme-aware tooltips and responsive viewport resizing

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, Filter } from 'lucide-react';

interface FormScoreDayPoint {
  dayNumber: number;
  label: string;
  date: string;
  avgScore: number;
  bestScore: number;
}

interface FormScoreChartProps {
  overallData: FormScoreDayPoint[];
  exerciseTrends: Record<string, { dayNumber: number; date: string; score: number }[]>;
}

export default function FormScoreChart({
  overallData,
  exerciseTrends,
}: FormScoreChartProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  const exerciseOptions = ['All Exercises', 'Squat', 'Push-Up', 'Bicep Curl', 'Lunge', 'Plank'];

  // Build chart dataset based on selected exercise
  let chartData: { label: string; score: number; trendScore?: number }[] = [];

  if (selectedExercise === 'all') {
    chartData = overallData.map((d) => ({
      label: d.label,
      score: d.avgScore,
    }));
  } else {
    const list = exerciseTrends[selectedExercise] || [];
    chartData = list.map((item) => ({
      label: `Day ${item.dayNumber}`,
      score: item.score,
    }));
  }

  // Compute a simple linear regression trend line if we have >= 2 points
  if (chartData.length >= 2) {
    const n = chartData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = chartData[i].score;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    chartData = chartData.map((pt, i) => ({
      ...pt,
      trendScore: Math.round(Math.min(100, Math.max(40, slope * i + intercept))),
    }));
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-xl space-y-4">
      {/* Header & Exercise Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Form Accuracy Progression
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Biomechanical computer vision accuracy over time
            </p>
          </div>
        </div>

        {/* Dropdown Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Exercises (Average)</option>
            {exerciseOptions.slice(1).map((ex) => (
              <option key={ex} value={ex}>
                {ex} Only
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No form score logs recorded yet for this selection.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: unknown, name?: unknown) => [
                  `${String(value ?? 0)}%`,
                  name === 'score' ? 'Form Score' : 'Trend Line',
                ]}
              />
              {/* Actual Scores Line */}
              <Line
                type="monotone"
                dataKey="score"
                name="score"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              {/* Linear Regression Trend Line */}
              {chartData[0]?.trendScore !== undefined && (
                <Line
                  type="linear"
                  dataKey="trendScore"
                  name="trendScore"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
