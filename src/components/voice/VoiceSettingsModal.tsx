'use client';

// src/components/voice/VoiceSettingsModal.tsx
// FitForm Voice Coaching and Sound Settings Modal
// Allows adjusting voice coaching, voice selection, speed, volume, and countdown beeps.

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Play,
  RotateCcw,
  Check,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VoiceSettings,
  DEFAULT_VOICE_SETTINGS,
  getStoredVoiceSettings,
  saveStoredVoiceSettings,
} from '@/lib/voice/voiceSettings';
import { playSynthesizedTone } from '@/lib/voice/soundEffects';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | null;
}

export default function VoiceSettingsModal({
  isOpen,
  onClose,
  userId,
}: VoiceSettingsModalProps) {
  const [settings, setSettings] = useState<VoiceSettings>(() => getStoredVoiceSettings(userId));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Load available speech voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeechSupported(false);
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Sync settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredVoiceSettings(userId));
    }
  }, [isOpen, userId]);

  const updateSettings = (partial: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveStoredVoiceSettings(next, userId);
      return next;
    });
  };

  const handleTestVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Beep sound preview if beeps enabled
    if (settings.beepsEnabled) {
      playSynthesizedTone(750, 100, settings.volume * 0.3);
    }

    if (!settings.enabled) return;

    window.speechSynthesis.cancel();
    setIsTestingVoice(true);

    const testUtterance = new SpeechSynthesisUtterance('Looking good! Keep your form steady and controlled.');
    if (settings.voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosen) testUtterance.voice = chosen;
    }
    testUtterance.rate = settings.speed;
    testUtterance.volume = settings.volume;

    testUtterance.onend = () => setIsTestingVoice(false);
    testUtterance.onerror = () => setIsTestingVoice(false);

    window.speechSynthesis.speak(testUtterance);
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_VOICE_SETTINGS);
    saveStoredVoiceSettings(DEFAULT_VOICE_SETTINGS, userId);
  };

  if (!isOpen) return null;

  // Filter English voices
  const englishVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('en-')
  );
  const displayVoices = englishVoices.length > 0 ? englishVoices : voices;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-500/20 bg-white/95 dark:bg-slate-900/95 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                {settings.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Voice & Sound Coach
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customized audio feedback for your workouts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isSpeechSupported && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/30 text-xs text-amber-800 dark:text-amber-200 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Speech synthesis is not supported in this browser, but on-screen visual captions are always active.
              </span>
            </div>
          )}

          <div className="space-y-6">
            {/* Toggle 1: Voice Coaching */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Spoken Form Corrections
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Speak short cues when form needs adjusting
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Beeps & Countdown Tone */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Rest Countdown Beeps & Haptics
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Soft chime at 10 seconds and 3, 2, 1 countdown
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateSettings({ beepsEnabled: !settings.beepsEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.beepsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.beepsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Voice Dropdown Selection */}
            {isSpeechSupported && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Coach Voice
                </label>
                <select
                  value={settings.voiceURI || ''}
                  onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
                  disabled={!settings.enabled}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">Auto (Default English)</option>
                  {displayVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speed & Volume Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Speed Slider */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Speech Speed</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{settings.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={settings.speed}
                  onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
                  disabled={!settings.enabled}
                  className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Volume</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                  disabled={!settings.enabled}
                  className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Soft</span>
                  <span>Medium</span>
                  <span>Full</span>
                </div>
              </div>
            </div>

            {/* Toggle 3: Rep Counting Announcements */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Spoken Rep Count
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Speak number on each rep (off by default)
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateSettings({ announceReps: !settings.announceReps })}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  settings.announceReps && settings.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.announceReps && settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200/80 dark:border-white/10 mt-6">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isTestingVoice || !isSpeechSupported}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition active:scale-98 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isTestingVoice ? 'Speaking...' : 'Test Voice'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 active:scale-98"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
