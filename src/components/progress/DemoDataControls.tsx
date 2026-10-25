'use client';

// src/components/progress/DemoDataControls.tsx
// Development-Only Demo Data Management Panel
// Allows generating and deleting realistic 3-week sample history for testing without touching real profiles.

import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, Sparkles, Check, AlertCircle } from 'lucide-react';
import { setStoredActiveUserId } from '@/lib/profileStorage';

interface DemoDataControlsProps {
  onRefresh: () => void;
}

export default function DemoDataControls({ onRefresh }: DemoDataControlsProps) {
  const [hasDemoUser, setHasDemoUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkDemoStatus = async () => {
    try {
      const res = await fetch('/api/dev/demo-data');
      if (res.ok) {
        const data = await res.json();
        setHasDemoUser(data.exists);
      }
    } catch {
      // In production or when endpoint fails
    }
  };

  useEffect(() => {
    checkDemoStatus();
  }, []);

  // Hide completely in production builds
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/dev/demo-data', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load demo data');
      }
      const data = await res.json();
      setHasDemoUser(true);
      setMessage('Demo data loaded successfully!');

      // Switch active profile to Demo User
      if (data.user?.id) {
        setStoredActiveUserId(data.user.id);
      }

      setTimeout(() => setMessage(null), 4000);
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error loading demo data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDemo = async () => {
    setIsLoading(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/dev/demo-data', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete demo data');
      }
      setHasDemoUser(false);
      setMessage('Demo profile and records deleted cleanly.');
      setTimeout(() => setMessage(null), 4000);
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error deleting demo data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-dashed border-indigo-400/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <div>
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
              <span>Developer Demo Data Tool</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Dev Only
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Simulates ~3 weeks of realistic progress (form improvement, rest &amp; missed days, weight trend) in an isolated profile.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{hasDemoUser ? 'Reload Demo Data' : 'Load Demo Data'}</span>
          </button>

          {hasDemoUser && (
            <button
              type="button"
              onClick={handleDeleteDemo}
              disabled={isLoading}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50 cursor-pointer"
              title="Delete demo profile only"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Demo</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
          <Check className="w-3.5 h-3.5" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 text-[11px] text-rose-500 font-semibold flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
