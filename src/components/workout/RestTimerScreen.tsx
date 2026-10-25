'use client';

// src/components/workout/RestTimerScreen.tsx
// FitForm Real-Timestamp Rest Timer Screen
// Features:
// - Timestamp-accurate countdown ring (immune to background throttling).
// - Dynamic exercise tip for the upcoming exercise.
// - Preset chips, +15s, -15s, +30s adjustments with remembered preferences.
// - Pause, resume, skip controls.
// - Web Audio API beeps, haptics, and voice countdown cues (10s, 3, 2, 1).
// - Voice settings launcher button.
// - Explicit "Start Next Set" button (prevents auto-firing camera without user gesture).

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Plus,
  Minus,
  RotateCcw,
  Volume2,
  Info,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getExerciseTip, REST_COUNTDOWN_CUES } from '@/lib/voice/phrases';
import { CountdownSounds } from '@/lib/voice/soundEffects';
import { globalSpeechScheduler } from '@/lib/voice/speechScheduler';
import { getStoredVoiceSettings, VoiceSettings } from '@/lib/voice/voiceSettings';
import {
  getStoredRestPreference,
  saveStoredRestPreference,
  clearStoredRestPreference,
} from '@/lib/workout/restPreferences';
import VoiceSettingsModal from '../voice/VoiceSettingsModal';

interface RestTimerScreenProps {
  currentSetLogId?: number | null;
  recommendedRestSeconds: number;
  nextExerciseName: string;
  nextSetNumber: number;
  nextTotalSets: number;
  userId?: number | null;
  onFinishRest: (actualSecondsRested: number) => void;
}

export default function RestTimerScreen({
  recommendedRestSeconds,
  nextExerciseName,
  nextSetNumber,
  nextTotalSets,
  userId,
  onFinishRest,
}: RestTimerScreenProps) {
  // Initial target rest duration (uses user's saved preference or recommended default)
  const initialDuration = getStoredRestPreference(
    nextExerciseName,
    recommendedRestSeconds,
    userId
  );

  const [targetDuration, setTargetDuration] = useState<number>(initialDuration);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialDuration);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isReadyToStart, setIsReadyToStart] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // Real timestamp tracking for precision
  const restStartTimeRef = useRef<number>(Date.now());
  const expectedEndTimeRef = useRef<number>(Date.now() + initialDuration * 1000);
  const pausedTimeRemainingRef = useRef<number>(initialDuration);
  const firedCuesRef = useRef<Set<number>>(new Set());

  const voiceSettingsRef = useRef<VoiceSettings>(getStoredVoiceSettings(userId));

  // Listen for voice settings updates
  useEffect(() => {
    const handleVoiceSettingsChange = (e: Event) => {
      const custom = (e as CustomEvent<VoiceSettings>).detail;
      if (custom) voiceSettingsRef.current = custom;
    };
    window.addEventListener('fitform_voice_settings_changed', handleVoiceSettingsChange);
    return () => {
      window.removeEventListener('fitform_voice_settings_changed', handleVoiceSettingsChange);
    };
  }, []);

  // Set up timer loop using performance timestamps
  useEffect(() => {
    if (isPaused || isReadyToStart) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = expectedEndTimeRef.current - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));

      setSecondsRemaining(remaining);

      // Trigger audio & speech cues
      const settings = voiceSettingsRef.current;

      // 10 seconds cue
      if (remaining === 10 && !firedCuesRef.current.has(10)) {
        firedCuesRef.current.add(10);
        if (settings.beepsEnabled) {
          CountdownSounds.tenSecondsRemaining(settings.volume * 0.3);
        }
        globalSpeechScheduler.speak({
          text: REST_COUNTDOWN_CUES.TEN_SECONDS,
          isCountdown: true,
          priority: 90,
        });
      }

      // 3 seconds cue
      if (remaining === 3 && !firedCuesRef.current.has(3)) {
        firedCuesRef.current.add(3);
        if (settings.beepsEnabled) {
          CountdownSounds.threeOrTwo(settings.volume * 0.3);
        }
        globalSpeechScheduler.speak({
          text: REST_COUNTDOWN_CUES.THREE,
          isCountdown: true,
          priority: 90,
        });
      }

      // 2 seconds cue
      if (remaining === 2 && !firedCuesRef.current.has(2)) {
        firedCuesRef.current.add(2);
        if (settings.beepsEnabled) {
          CountdownSounds.threeOrTwo(settings.volume * 0.3);
        }
        globalSpeechScheduler.speak({
          text: REST_COUNTDOWN_CUES.TWO,
          isCountdown: true,
          priority: 90,
        });
      }

      // 1 second cue
      if (remaining === 1 && !firedCuesRef.current.has(1)) {
        firedCuesRef.current.add(1);
        if (settings.beepsEnabled) {
          CountdownSounds.oneOrGo(settings.volume * 0.35);
        }
        globalSpeechScheduler.speak({
          text: REST_COUNTDOWN_CUES.ONE,
          isCountdown: true,
          priority: 90,
        });
      }

      // Rest finished
      if (remaining <= 0) {
        clearInterval(interval);
        setIsReadyToStart(true);
        globalSpeechScheduler.speak({
          text: REST_COUNTDOWN_CUES.GET_READY,
          isCountdown: true,
          priority: 95,
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, isReadyToStart]);

  // Adjust total target and remaining seconds
  const adjustDuration = useCallback(
    (deltaSeconds: number) => {
      const newTarget = Math.max(10, Math.min(600, targetDuration + deltaSeconds));
      const newRemaining = Math.max(1, secondsRemaining + deltaSeconds);

      setTargetDuration(newTarget);
      setSecondsRemaining(newRemaining);

      expectedEndTimeRef.current = Date.now() + newRemaining * 1000;
      saveStoredRestPreference(nextExerciseName, newTarget, userId);
    },
    [targetDuration, secondsRemaining, nextExerciseName, userId]
  );

  // Set explicit preset chip
  const setPresetChip = useCallback(
    (seconds: number) => {
      setTargetDuration(seconds);
      setSecondsRemaining(seconds);
      expectedEndTimeRef.current = Date.now() + seconds * 1000;
      saveStoredRestPreference(nextExerciseName, seconds, userId);
    },
    [nextExerciseName, userId]
  );

  // Reset to recommended
  const handleResetToRecommended = useCallback(() => {
    clearStoredRestPreference(nextExerciseName, userId);
    setPresetChip(recommendedRestSeconds);
  }, [nextExerciseName, recommendedRestSeconds, userId, setPresetChip]);

  // Pause / Resume
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume
      expectedEndTimeRef.current = Date.now() + pausedTimeRemainingRef.current * 1000;
      setIsPaused(false);
    } else {
      // Pause
      pausedTimeRemainingRef.current = secondsRemaining;
      setIsPaused(true);
    }
  }, [isPaused, secondsRemaining]);

  // Complete rest and advance
  const handleFinalizeRest = useCallback(() => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - restStartTimeRef.current) / 1000));
    globalSpeechScheduler.cancel();
    onFinishRest(elapsedSeconds);
  }, [onFinishRest]);

  // Circle SVG geometry
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = targetDuration > 0 ? (targetDuration - secondsRemaining) / targetDuration : 1;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const tipText = getExerciseTip(nextExerciseName);

  const presets = [
    { label: '30s', secs: 30 },
    { label: '60s', secs: 60 },
    { label: '90s', secs: 90 },
    { label: '2 min', secs: 120 },
    { label: '3 min', secs: 180 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        userId={userId}
      />

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden text-center bg-white/80 dark:bg-slate-900/80">
        {/* Top Controls: Header + Sound Setting Button */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 mb-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Rest Period
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-sm"
            title="Voice & Sound Settings"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              className="text-slate-100 dark:text-slate-800/80"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Animated Progress Arc */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              className="text-indigo-600 dark:text-indigo-400 transition-all duration-200 ease-linear"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isReadyToStart ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center px-4"
              >
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                  Ready!
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tap Start to begin
                </div>
              </motion.div>
            ) : (
              <>
                <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                  {secondsRemaining}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Seconds Left
                </div>
              </>
            )}
          </div>
        </div>

        {/* Next Exercise Info Box */}
        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-500/20 text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Upcoming Set
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Set {nextSetNumber} of {nextTotalSets}
            </span>
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {nextExerciseName}
          </h3>

          <div className="flex items-start space-x-2 mt-2 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>{tipText}</span>
          </div>
        </div>

        {/* Quick Adjustments & Preset Chips */}
        {!isReadyToStart && (
          <div className="mt-6 space-y-3">
            {/* Preset Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.secs}
                  type="button"
                  onClick={() => setPresetChip(p.secs)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    targetDuration === p.secs
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => adjustDuration(30)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-300/60 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 transition"
              >
                +30s
              </button>
            </div>

            {/* Minus/Plus 15s + Reset */}
            <div className="flex items-center justify-center space-x-3 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => adjustDuration(-15)}
                disabled={secondsRemaining <= 15}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-40"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>15s</span>
              </button>

              <button
                type="button"
                onClick={() => adjustDuration(15)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>15s</span>
              </button>

              {targetDuration !== recommendedRestSeconds && (
                <button
                  type="button"
                  onClick={handleResetToRecommended}
                  className="inline-flex items-center space-x-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to {recommendedRestSeconds}s</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Controls */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {isReadyToStart ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleFinalizeRest}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-base transition shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Start Set #{nextSetNumber}</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePause}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-500" /> : <Pause className="w-4 h-4 text-amber-500" />}
                <span>{isPaused ? 'Resume Rest' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeRest}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>Skip Rest</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
