'use client';

// FitForm Developer Pose Test & Simulation Studio (/dev/pose-test)
// Allows visual replaying of synthetic pose landmark sequences through the exact same
// Exercise Analyzers (Squat, Push-Up, Bicep Curl), skeleton renderer, and live telemetry panel
// without requiring a webcam. Dev-only utility.

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Sparkles,
  Layers,
  Volume2,
  Timer,
} from 'lucide-react';
import { globalSpeechScheduler } from '@/lib/voice/speechScheduler';
import { getCorrectionPhrase, POSITIVE_CUES } from '@/lib/voice/phrases';
import RestTimerScreen from '@/components/workout/RestTimerScreen';
import VoiceSettingsModal from '@/components/voice/VoiceSettingsModal';
import {
  ALL_SYNTHETIC_SCENARIOS,
  SyntheticScenario,
} from '@/lib/pose/syntheticData';
import { createExerciseAnalyzer } from '@/lib/pose/analyzers/registry';
import { IExerciseAnalyzer, ExerciseAnalysisResult } from '@/lib/pose/types';
import { drawPoseSkeleton } from '@/lib/pose/skeletonDrawing';

export default function PoseTestPage() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const scenario: SyntheticScenario = ALL_SYNTHETIC_SCENARIOS[selectedScenarioIndex];

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [analysis, setAnalysis] = useState<ExerciseAnalysisResult | null>(null);
  const [captionText, setCaptionText] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isTestRestActive, setIsTestRestActive] = useState(false);

  // Subscribe to speech captions
  useEffect(() => {
    globalSpeechScheduler.setSetInProgress(true);
    const unsub = globalSpeechScheduler.addCaptionListener((cap) => {
      setCaptionText(cap);
    });
    return () => {
      unsub();
      globalSpeechScheduler.setSetInProgress(false);
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyzerRef = useRef<IExerciseAnalyzer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Re-create analyzer when scenario changes
  useEffect(() => {
    const analyzer = createExerciseAnalyzer(scenario.exerciseId, {
      arm: 'right',
      leg: 'auto',
      targetSeconds: 45,
    });
    analyzerRef.current = analyzer;
    setCurrentFrameIndex(0);
    setIsPlaying(false);

    // Initial frame
    if (analyzer && scenario.frames.length > 0) {
      const res = analyzer.processFrame(
        scenario.frames[0].landmarks,
        scenario.frames[0].timestamp
      );
      setAnalysis(res);
    }
  }, [selectedScenarioIndex, scenario]);

  // Render skeleton to canvas whenever frame changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = scenario.frames[currentFrameIndex];
    if (!frame) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle floor line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height * 0.88);
    ctx.lineTo(canvas.width - 40, canvas.height * 0.88);
    ctx.stroke();

    // Draw skeleton
    drawPoseSkeleton(
      ctx,
      frame.landmarks,
      canvas.width,
      canvas.height,
      analysis?.formStatus || 'good',
      false // do not mirror synthetic data
    );
  }, [currentFrameIndex, scenario, analysis]);

  // Frame stepper
  const stepToFrame = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= scenario.frames.length) return;

    const analyzer = createExerciseAnalyzer(scenario.exerciseId, {
      arm: 'right',
      leg: 'auto',
      targetSeconds: 45,
    });
    analyzerRef.current = analyzer;
    let res = null;
    if (analyzer) {
      for (let i = 0; i <= targetIndex; i++) {
        const f = scenario.frames[i];
        res = analyzer.processFrame(f.landmarks, f.timestamp);
      }
    }
    setCurrentFrameIndex(targetIndex);
    setAnalysis(res);
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.round(50 / playbackSpeed);

    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= scenario.frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const nextIdx = prev + 1;
        const f = scenario.frames[nextIdx];
        if (analyzerRef.current) {
          const res = analyzerRef.current.processFrame(f.landmarks, f.timestamp);
          setAnalysis(res);
        }
        return nextIdx;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, scenario]);

  // Trigger spoken voice cues on demand for testing
  const triggerVoiceTest = (mistakeText: string) => {
    const correction = getCorrectionPhrase(scenario.exerciseId, mistakeText);
    if (correction) {
      globalSpeechScheduler.speak({
        text: correction.phrase,
        priority: correction.priority,
        mistakeKey: mistakeText,
      });
    }
  };

  const triggerPositiveVoice = () => {
    const cue = POSITIVE_CUES[Math.floor(Math.random() * POSITIVE_CUES.length)];
    globalSpeechScheduler.speak({
      text: cue,
      priority: 20,
      isPositive: true,
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    stepToFrame(0);
  };

  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [logSaveSuccess, setLogSaveSuccess] = useState<string | null>(null);

  const handleSaveSimulatedLog = async () => {
    setIsLoggingSet(true);
    setLogSaveSuccess(null);
    try {
      const usersRes = await fetch('/api/users');
      const data = await usersRes.json();
      const users = data.users || [];
      if (users.length === 0) {
        alert('Please create a profile in onboarding first.');
        return;
      }
      const user = users[0];

      const score = analysis?.currentScore || 95;
      const mistakes = analysis?.completedReps.flatMap((r) => r.mistakes) || [];
      const reps = Math.max(1, analysis?.repCount || 10);

      const exerciseName =
        scenario.exerciseId === 'push_up'
          ? 'Push-Up'
          : scenario.exerciseId === 'bicep_curl'
          ? 'Bicep Curl'
          : 'Bodyweight Squat';

      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          dayNumber: 1,
          exercise: exerciseName,
          setNumber: 1,
          reps,
          formScore: score,
          mistakes,
          restSeconds: 60,
          mode: 'live_camera',
        }),
      });

      if (!res.ok) throw new Error('Failed to save log');
      setLogSaveSuccess(
        `Saved simulated set to Day 1 logs for ${user.name} (${exerciseName}, ${reps} reps, ${score}% form score).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Error saving simulated log: ' + msg);
    } finally {
      setIsLoggingSet(false);
    }
  };

  const currentFrame = scenario.frames[currentFrameIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/plan"
            className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            Back to Plan
          </Link>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              Developer Studio
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Form Check &amp; Pose Simulation
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Replay synthetic body-point sequences through Squat, Push-Up, and Bicep Curl analyzers without a physical webcam.
          </p>
        </div>

        {/* Scenario Selector Dropdown */}
        <div className="sm:w-80">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Select Test Scenario ({ALL_SYNTHETIC_SCENARIOS.length} Available)
          </label>
          <select
            value={selectedScenarioIndex}
            onChange={(e) => setSelectedScenarioIndex(Number(e.target.value))}
            className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {ALL_SYNTHETIC_SCENARIOS.map((sc, idx) => (
              <option key={sc.id} value={idx}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Canvas Simulator / Right Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Canvas & Video Simulation Frame (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`glass-panel rounded-2xl p-4 border-2 transition-all duration-300 relative overflow-hidden bg-slate-950 ${
              analysis?.formStatus === 'good'
                ? 'border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
                : analysis?.formStatus === 'warning'
                ? 'border-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.2)]'
                : 'border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.2)]'
            }`}
          >
            {/* Top State Badge */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white flex items-center space-x-1.5">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>
                  Synthetic Sequence · Frame {currentFrameIndex + 1}/{scenario.frames.length}
                </span>
              </span>

              <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider bg-slate-900/90 backdrop-blur-md border border-white/15 text-indigo-400">
                {analysis?.state || 'READY'}
              </span>
            </div>

            {/* Skeleton Canvas Viewport */}
            <div className="aspect-[4/3] w-full relative rounded-xl overflow-hidden bg-slate-900/90 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full object-contain"
              />

              {/* Push-Up 1.5s Hold Indicator */}
              {analysis &&
                analysis.exerciseId === 'push_up' &&
                !analysis.isReady &&
                analysis.isBodyInFrame && (
                  <div className="absolute inset-x-8 bottom-6 z-20 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 text-center text-white">
                    <div className="text-xs font-bold text-indigo-400 mb-1.5">
                      {analysis.latestMistake || 'Hold plank for 1.5s to start set'}
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden max-w-xs mx-auto border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-150"
                        style={{
                          width: `${Math.round((analysis.readyProgress || 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* Out of Frame Alert */}
              {analysis && !analysis.isBodyInFrame && (
                <div className="absolute inset-x-4 bottom-4 z-20 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold text-center flex items-center justify-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{analysis.bodyInFrameMessage}</span>
                </div>
              )}
            </div>

            {/* Frame Scrubber Timeline */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>{currentFrame?.description || 'Synthetic Frame'}</span>
                <span className="font-mono">{(currentFrame?.timestamp || 0) / 1000}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={scenario.frames.length - 1}
                value={currentFrameIndex}
                onChange={(e) => stepToFrame(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Playback Controls Card */}
          <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Sequence'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                type="button"
                onClick={() => stepToFrame(Math.min(scenario.frames.length - 1, currentFrameIndex + 1))}
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step +1</span>
              </button>
            </div>

            {/* Speed Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-semibold">
              <span className="text-[10px] text-slate-400 uppercase px-2 font-bold">Speed:</span>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    playbackSpeed === s
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry & Scenario Validation Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Telemetry Display */}
          <div className="glass-panel rounded-2xl p-6 border">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              <span>Biomechanical Telemetry</span>
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1" />
                Real-Time
              </span>
            </div>

            {/* Rep Counter & Form Score */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {analysis?.repCount || 0}
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    (exp: {scenario.expectedReps})
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1">
                  Reps Counted
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
                <div
                  className={`text-4xl font-black ${
                    (analysis?.currentScore ?? 100) >= 90
                      ? 'text-emerald-500'
                      : (analysis?.currentScore ?? 100) >= 75
                      ? 'text-amber-500'
                      : 'text-red-500'
                  }`}
                >
                  {analysis?.currentScore ?? 100}%
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1">
                  Form Score
                </div>
              </div>
            </div>

            {/* Dynamic Joint Angle Meters */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    {analysis?.primaryMetric.name || 'Primary Joint Angle'}
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {analysis?.primaryMetric.value ?? 180}
                    {analysis?.primaryMetric.unit || '°'} ({analysis?.primaryMetric.targetDesc || ''})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-100"
                    style={{
                      width: `${analysis?.primaryMetric.percent ?? 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    {analysis?.secondaryMetric.name || 'Secondary Posture'}
                  </span>
                  <span
                    className={`font-mono ${
                      analysis?.secondaryMetric.isWarning
                        ? 'text-red-500 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {analysis?.secondaryMetric.value ?? 0}
                    {analysis?.secondaryMetric.unit || '°'} ({analysis?.secondaryMetric.limitDesc || ''})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      analysis?.secondaryMetric.isWarning ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${analysis?.secondaryMetric.percent ?? 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Current Real-Time Feedback */}
            <div
              className={`p-4 rounded-xl border flex items-center space-x-3 transition-colors ${
                analysis?.formStatus === 'good'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : analysis?.formStatus === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300'
                  : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-300'
              }`}
            >
              {analysis?.formStatus === 'good' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : analysis?.formStatus === 'warning' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              )}
              <div className="text-xs font-bold">
                {analysis?.latestMistake || 'Ready'}
              </div>
            </div>
          </div>

          {/* Scenario Expectations Card */}
          <div className="glass-panel rounded-2xl p-5 border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scenario Specifications
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {scenario.description}
            </p>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Reps:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {scenario.expectedReps}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Score:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {scenario.expectedMinScore}% – {scenario.expectedMaxScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Mistakes:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {scenario.expectedMistakes.length === 0
                    ? 'None (Clean)'
                    : scenario.expectedMistakes.join(', ')}
                </span>
              </div>
            </div>

            {/* Step 4 Voice & Audio Simulator Panel */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span className="flex items-center space-x-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Voice & Sound Tester</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Settings
                </button>
              </div>

              {captionText && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center space-x-2 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                  <span>Caption: &quot;{captionText}&quot;</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => triggerVoiceTest('not deep')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition"
                >
                  🔊 &quot;Go deeper&quot;
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceTest('leaning')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition"
                >
                  🔊 &quot;Keep chest up&quot;
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceTest('hips sagging')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition"
                >
                  🔊 &quot;Hips up&quot;
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceTest('too fast')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition"
                >
                  🔊 &quot;Slow down&quot;
                </button>
                <button
                  type="button"
                  onClick={() => triggerVoiceTest('out of frame')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition"
                >
                  🔊 &quot;Step back&quot;
                </button>
                <button
                  type="button"
                  onClick={triggerPositiveVoice}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-600/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 text-left transition"
                >
                  ✨ Positive Cue
                </button>
              </div>

              {/* Rest Timer Modal Preview Launcher */}
              <button
                type="button"
                onClick={() => setIsTestRestActive(true)}
                className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-2 rounded-xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 text-cyan-800 dark:text-cyan-200 text-xs font-bold transition cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 text-cyan-500" />
                <span>Launch Rest Timer (30s Preview)</span>
              </button>
            </div>

            {/* Test DB Log Button */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleSaveSimulatedLog}
                disabled={isLoggingSet}
                className="w-full inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoggingSet ? 'Saving Log...' : 'Save As Test Workout Log'}</span>
              </button>
              {logSaveSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 text-center">
                  {logSaveSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Test Rest Timer Overlay */}
      {isTestRestActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl relative">
            <RestTimerScreen
              recommendedRestSeconds={30}
              nextExerciseName="Squat"
              nextSetNumber={2}
              nextTotalSets={4}
              onFinishRest={() => setIsTestRestActive(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
