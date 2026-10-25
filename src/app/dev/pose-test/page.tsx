'use client';

// FitForm Developer Pose Test & Simulation Studio (/dev/pose-test)
// Allows visual replaying of synthetic pose landmark sequences through the exact same
// SquatDetector, skeleton renderer, and live telemetry panel without requiring a webcam.
// Dev-only utility.

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
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ALL_SYNTHETIC_SCENARIOS,
  SyntheticScenario,
} from '@/lib/pose/syntheticData';
import { SquatDetector, SquatAnalysisResult } from '@/lib/pose/squatDetector';
import { drawPoseSkeleton } from '@/lib/pose/skeletonDrawing';

export default function PoseTestPage() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const scenario: SyntheticScenario = ALL_SYNTHETIC_SCENARIOS[selectedScenarioIndex];

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [analysis, setAnalysis] = useState<SquatAnalysisResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<SquatDetector>(new SquatDetector());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset detector when scenario changes
  useEffect(() => {
    detectorRef.current.reset();
    setCurrentFrameIndex(0);
    setIsPlaying(false);

    // Initial frame
    if (scenario.frames.length > 0) {
      const res = detectorRef.current.processFrame(
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

    // Reset and replay up to targetIndex so state machine is consistent
    detectorRef.current.reset();
    let res = null;
    for (let i = 0; i <= targetIndex; i++) {
      const f = scenario.frames[i];
      res = detectorRef.current.processFrame(f.landmarks, f.timestamp);
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
        const res = detectorRef.current.processFrame(f.landmarks, f.timestamp);
        setAnalysis(res);
        return nextIdx;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, scenario]);

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
      // Fetch active user or first user
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

      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          dayNumber: 1,
          exercise: 'Bodyweight Squat',
          setNumber: 1,
          reps,
          formScore: score,
          mistakes,
          restSeconds: 60,
          mode: 'live_camera',
        }),
      });

      if (!res.ok) throw new Error('Failed to save log');
      setLogSaveSuccess(`Saved simulated set to Day 1 logs for ${user.name} (${reps} reps, ${score}% form score).`);
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
              Squat Pose &amp; Rep Simulation
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test and verify MediaPipe squat rep counting, depth angles, and form scoring without a webcam.
          </p>
        </div>

        {/* Scenario Selector Dropdown */}
        <div className="sm:w-80">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Select Test Scenario
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
            {/* Status Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulated Camera Feed</span>
              </span>

              {/* State Badge */}
              <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider bg-slate-900/90 backdrop-blur-md border border-white/15 text-indigo-400">
                {analysis?.state || 'STANDING'}
              </span>
            </div>

            {/* Canvas */}
            <div className="aspect-[4/3] w-full flex items-center justify-center relative">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full object-contain rounded-xl"
              />

              {/* Body out of frame warning banner */}
              {analysis && !analysis.isBodyInFrame && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mb-2" />
                  <h3 className="text-base font-bold">
                    {analysis.bodyInFrameMessage}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Key joints have low confidence. Stand 2 to 3 metres back side-on.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Frame info */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Frame {currentFrameIndex + 1} / {scenario.frames.length} ({currentFrame?.timestamp || 0}ms)
              </span>
              <span className="italic">{currentFrame?.description || scenario.description}</span>
            </div>
          </div>

          {/* Playback Controls Bar */}
          <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-md"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => stepToFrame(Math.min(scenario.frames.length - 1, currentFrameIndex + 1))}
                className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Step Forward"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Scrubber Range Input */}
            <div className="flex-1 min-w-[140px] px-2">
              <input
                type="range"
                min={0}
                max={scenario.frames.length - 1}
                value={currentFrameIndex}
                onChange={(e) => stepToFrame(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Playback Speed Toggle */}
            <div className="flex items-center space-x-1 text-xs">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    playbackSpeed === spd
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Test DB Log Button */}
          <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white block">Log Simulated Set to Database</strong>
              Save this simulated squat set through the real API into SQLite &amp; workout_logs.json.
            </div>
            <button
              type="button"
              disabled={isLoggingSet}
              onClick={handleSaveSimulatedLog}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isLoggingSet ? 'Logging...' : 'Log Simulated Set to DB'}
            </button>
          </div>

          {logSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{logSaveSuccess}</span>
            </div>
          )}
        </div>

        {/* Right: Live Telemetry Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Rep & Score Display */}
          <div className="glass-panel rounded-2xl p-6 border">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Live Form Telemetry</span>
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1" />
                Real-Time
              </span>
            </h2>

            {/* Score & Reps Hero */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {analysis?.repCount ?? 0}
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

            {/* Biomechanical Live Angles */}
            <div className="space-y-3 mb-6">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Knee Angle</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {analysis?.kneeAngle}° (target: &lt;100°)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, Math.max(0, (analysis?.kneeAngle || 180) / 1.8))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Torso Lean</span>
                  <span
                    className={`font-mono ${
                      (analysis?.torsoLean || 0) > 45 ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {analysis?.torsoLean}° (limit: 45°)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      (analysis?.torsoLean || 0) > 45 ? 'bg-red-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, ((analysis?.torsoLean || 0) / 60) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Real-Time Feedback Callout */}
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
                {analysis?.latestMistake || 'Ready · Stand side-on to begin squat'}
              </div>
            </div>
          </div>

          {/* Rep History Breakdown Card */}
          <div className="glass-panel rounded-2xl p-5 border">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Completed Reps Breakdown ({analysis?.completedReps.length || 0})</span>
            </h3>

            {(!analysis || analysis.completedReps.length === 0) ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                No reps completed yet. Play or scrub forward to complete a repetition.
              </p>
            ) : (
              <div className="space-y-2">
                {analysis.completedReps.map((r) => (
                  <div
                    key={r.repNumber}
                    className="p-3 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-2">
                        Rep #{r.repNumber}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Min Depth: {r.lowestKneeAngle}° • Lean: {r.maxTorsoLean}° • Tempo: {r.descentDurationMs}ms
                      </span>
                      {r.mistakes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.mistakes.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-black text-sm ${
                        r.score >= 90
                          ? 'text-emerald-500'
                          : r.score >= 75
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {r.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 6 3D Character Area Placeholder */}
          <div className="glass-panel rounded-2xl p-5 border border-dashed border-indigo-400/30 text-center py-6">
            <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              3D Character Muscle Highlight
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Reserved area for interactive Three.js 3D model (Coming in Step 6).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
