'use client';

// FitForm Workout Logs Page (/logs)
// Displays a history table of all workout performance records (newest first).
// Provides export to JSON and CSV, and a dev-only 'Add test log' button.

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  PlusCircle,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera,
  Video,
} from 'lucide-react';
import { getStoredActiveUserId } from '@/lib/profileStorage';

interface LogItem {
  id: number;
  userId: number;
  userName: string;
  dayNumber: number;
  exercise: string;
  setNumber: number;
  reps: number;
  formScore: number | null;
  mistakes: string[];
  restSeconds: number;
  mode: 'live_camera' | 'video_upload';
  completedAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddingTestLog, setIsAddingTestLog] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Check if running in development mode
  const isDevMode = process.env.NODE_ENV !== 'production';

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error('Failed to retrieve logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: unknown) {
      console.error('Fetch logs error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not load workout logs.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Add Test Log Handler (Visible in development)
  const handleAddTestLog = async () => {
    setIsAddingTestLog(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Find active user or fetch first user
      let userId = getStoredActiveUserId();
      let userName = 'Alex Johnson';

      const userRes = await fetch('/api/users');
      if (userRes.ok) {
        const userData = await userRes.json();
        const users = userData.users || [];
        if (users.length > 0) {
          const matched = userId ? users.find((u: { id: number }) => u.id === userId) : users[0];
          const chosen = matched || users[0];
          userId = chosen.id;
          userName = chosen.name;
        }
      }

      if (!userId) {
        // If no user exists at all, prompt user
        setErrorMessage('Please create a profile in Onboarding first before adding logs.');
        setIsAddingTestLog(false);
        return;
      }

      const sampleExercises = [
        { name: 'Bodyweight Squat', day: 1, mistakes: ['Knees caved inward at bottom'] },
        { name: 'Push-Up', day: 2, mistakes: [] },
        { name: 'Bicep Curl', day: 3, mistakes: ['Elbow swayed backward'] },
        { name: 'Walking / Static Lunge', day: 4, mistakes: ['Front knee passed toes excessively'] },
        { name: 'Forearm Plank', day: 5, mistakes: ['Hips sagged slightly at 25s'] },
      ];

      const sample = sampleExercises[Math.floor(Math.random() * sampleExercises.length)];
      const randomScore = Math.floor(Math.random() * 15) + 85; // 85 - 99 score

      const payload = {
        userId,
        userName,
        dayNumber: sample.day,
        exercise: sample.name,
        setNumber: 1,
        reps: 12,
        formScore: randomScore,
        mistakes: sample.mistakes,
        restSeconds: 45,
        mode: Math.random() > 0.5 ? 'live_camera' : 'video_upload',
      };

      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create test log');
      }

      setActionSuccessMessage(
        `Test log recorded for ${userName} (${sample.name}, Day ${sample.day}). data/workout_logs.json synchronized!`
      );
      // Reload logs table
      await fetchLogs();
    } catch (err: unknown) {
      console.error('Test log creation error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to record test workout log.'
      );
    } finally {
      setIsAddingTestLog(false);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    window.location.href = `/api/logs?format=${format}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-1">
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Exercise Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Workout Logs</h1>
            <p className="text-sm text-slate-400 mt-1">
              All logged training sessions, rep performance, form scores, and detected corrections.
            </p>
          </div>

          {/* Action Buttons: Export + Dev Test Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Export JSON */}
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FileJson className="w-4 h-4 text-amber-400" />
              <span>Export JSON</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Dev Mode Only: Add Test Log */}
            {isDevMode && (
              <button
                type="button"
                onClick={handleAddTestLog}
                disabled={isAddingTestLog}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {isAddingTestLog ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>Add Test Log (Dev)</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback notifications */}
        {actionSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Retrieving logs from database...</p>
        </div>
      ) : logs.length === 0 ? (
        /* Empty State */
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Workout Logs Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Completed workouts and form assessments will appear here automatically.
            {isDevMode && ' You can click "Add Test Log (Dev)" above to insert a sample record and verify file sync.'}
          </p>
          {isDevMode && (
            <button
              type="button"
              onClick={handleAddTestLog}
              disabled={isAddingTestLog}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Generate Sample Dev Log</span>
            </button>
          )}
        </div>
      ) : (
        /* Logs Table */
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Day</th>
                  <th className="py-3.5 px-4">Exercise</th>
                  <th className="py-3.5 px-4 text-center">Set</th>
                  <th className="py-3.5 px-4 text-center">Reps</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4">Detected Mistakes</th>
                  <th className="py-3.5 px-4 text-center">Rest</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {logs.map((log) => {
                  const dateFormatted = new Date(log.completedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      {/* User */}
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        {log.userName}
                      </td>

                      {/* Day */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                          Day {log.dayNumber}
                        </span>
                      </td>

                      {/* Exercise */}
                      <td className="py-3.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                        {log.exercise}
                      </td>

                      {/* Set */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        #{log.setNumber}
                      </td>

                      {/* Reps */}
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-300">
                        {log.reps}
                      </td>

                      {/* Form Score */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {log.formScore !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${
                              log.formScore >= 90
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : log.formScore >= 75
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}
                          >
                            {Math.round(log.formScore)}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Mistakes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {log.mistakes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.mistakes.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[10px]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Clean Form
                          </span>
                        )}
                      </td>

                      {/* Rest */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400 whitespace-nowrap">
                        {log.restSeconds}s
                      </td>

                      {/* Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-slate-800/80 border border-white/10 text-slate-300">
                          {log.mode === 'live_camera' ? (
                            <>
                              <Camera className="w-3 h-3 text-cyan-400" />
                              <span>Live Camera</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-3 h-3 text-purple-400" />
                              <span>Video Upload</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Date/Time */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {dateFormatted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
