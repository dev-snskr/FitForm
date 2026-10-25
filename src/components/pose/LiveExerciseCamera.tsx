'use client';

// FitForm Universal Live Camera Form Checker Component
// Multi-exercise pose estimation via MediaPipe Tasks Vision (zero CDN dependency).
// Supports: Bodyweight Squat, Push-Up, Bicep Curl, Walking/Static Lunge, Forearm Plank.
// Features:
// - Universal exercise plug-in architecture with automatic biomechanical analyzer resolution.
// - Interactive Left/Right arm selector for Bicep Curl (persisted to localStorage).
// - Interactive Auto/Left/Right leg selector for Lunge (persisted to localStorage).
// - 2.0s plank stability detection & large live hold timer with target seconds for Plank.
// - Real-time skeleton overlay, dynamic border glow (good/warning/bad).
// - Real-time joint angle meters, auto-finish on inactivity or target completion.
// - Privacy guarantee: "Your camera video stays on your device."

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Sparkles,
  ShieldAlert,
  Loader2,
  Lock,
  Timer,
  Clock,
} from 'lucide-react';
import { createExerciseAnalyzer, resolveExerciseId } from '@/lib/pose/analyzers/registry';
import { IExerciseAnalyzer, ExerciseAnalysisResult } from '@/lib/pose/types';
import { LandmarkPoint, smoothLandmarks } from '@/lib/pose/angleMath';
import { drawPoseSkeleton } from '@/lib/pose/skeletonDrawing';

interface LiveExerciseCameraProps {
  exerciseName: string;
  onSetCompleted: (result: {
    reps: number;
    durationSeconds?: number | null;
    formScore: number;
    mistakes: string[];
  }) => void;
  onCancel: () => void;
  targetReps: number;
  targetDurationSecs?: number | null;
  setNumber: number;
}

export default function LiveExerciseCamera({
  exerciseName,
  onSetCompleted,
  onCancel,
  targetReps,
  targetDurationSecs,
  setNumber,
}: LiveExerciseCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [analysis, setAnalysis] = useState<ExerciseAnalysisResult | null>(null);

  const exerciseId = resolveExerciseId(exerciseName);
  const isBicepCurl = exerciseId === 'bicep_curl';
  const isLunge = exerciseId === 'lunge';
  const isPlank = exerciseId === 'plank';

  // Arm selection for bicep curl (remembered in localStorage)
  const [bicepArm, setBicepArm] = useState<'left' | 'right'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fitform_bicep_arm');
      if (saved === 'left' || saved === 'right') return saved;
    }
    return 'right';
  });

  // Leg selection for lunge (remembered in localStorage)
  const [lungeLeg, setLungeLeg] = useState<'auto' | 'left' | 'right'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fitform_lunge_leg');
      if (saved === 'auto' || saved === 'left' || saved === 'right') return saved;
    }
    return 'auto';
  });

  // Analyzer reference
  const analyzerRef = useRef<IExerciseAnalyzer | null>(null);

  // Initialize analyzer
  useEffect(() => {
    const analyzer = createExerciseAnalyzer(exerciseName, {
      arm: bicepArm,
      leg: lungeLeg,
      targetSeconds: targetDurationSecs || 45,
    });
    analyzerRef.current = analyzer;
    return () => {
      analyzerRef.current = null;
    };
  }, [exerciseName, bicepArm, lungeLeg, targetDurationSecs]);

  // Handle switching arms
  const handleToggleArm = (arm: 'left' | 'right') => {
    setBicepArm(arm);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fitform_bicep_arm', arm);
    }
    if (analyzerRef.current && analyzerRef.current.setArmChoice) {
      analyzerRef.current.setArmChoice(arm);
    }
  };

  // Handle switching lunge leg
  const handleToggleLeg = (leg: 'auto' | 'left' | 'right') => {
    setLungeLeg(leg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fitform_lunge_leg', leg);
    }
    if (analyzerRef.current && analyzerRef.current.setLegChoice) {
      analyzerRef.current.setLegChoice(leg);
    }
  };

  // References to keep RAF loop lightweight
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<{
    detectForVideo: (
      video: HTMLVideoElement,
      time: number
    ) => { landmarks?: LandmarkPoint[][] };
    close?: () => void;
  } | null>(null);
  const prevLandmarksRef = useRef<LandmarkPoint[] | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const isComponentMountedRef = useRef<boolean>(true);

  // Completion trigger
  const handleFinishSet = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) {
      onSetCompleted({ reps: 0, durationSeconds: null, formScore: 100, mistakes: [] });
      return;
    }

    const reps = analyzer.getRepCount();
    const finalScore = analyzer.getTotalScore();
    const mistakes = analyzer.getMistakesSummary();

    if (analyzer.isTimedHold) {
      const holdSecs =
        analyzer.getHoldDurationSeconds?.() ?? analysis?.holdDurationSeconds ?? 0;
      onSetCompleted({
        reps: 0,
        durationSeconds: holdSecs,
        formScore: finalScore,
        mistakes,
      });
    } else {
      onSetCompleted({
        reps,
        durationSeconds: null,
        formScore: finalScore,
        mistakes,
      });
    }
  }, [onSetCompleted, analysis]);

  // 1. Initialize MediaPipe PoseLandmarker from local public folder
  useEffect(() => {
    isComponentMountedRef.current = true;

    async function initMediaPipe() {
      try {
        setIsLoadingModel(true);
        const { FilesetResolver, PoseLandmarker } = await import(
          '@mediapipe/tasks-vision'
        );

        if (!isComponentMountedRef.current) return;

        // Local WASM binaries from /public/mediapipe/wasm
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');

        let landmarker = null;
        try {
          // Attempt GPU acceleration first
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/mediapipe/models/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuErr) {
          console.warn('GPU delegate unavailable, falling back to CPU:', gpuErr);
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/mediapipe/models/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isComponentMountedRef.current) {
          poseLandmarkerRef.current = landmarker;
          setIsLoadingModel(false);
          startCamera();
        }
      } catch (err: unknown) {
        console.error('Failed to load MediaPipe model:', err);
        if (isComponentMountedRef.current) {
          setCameraError(
            'Unable to initialize pose tracking engine. Please refresh and try again.'
          );
          setIsLoadingModel(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isComponentMountedRef.current = false;
      stopCameraAndTracking();
    };
  }, []);

  // 2. Request Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!isComponentMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsTrackingActive(true);
        };
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      let errorMsg = 'Could not access camera.';
      const errName =
        err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        errorMsg =
          'Camera permission was denied. Please allow camera access in your browser address bar to use live form checking.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        errorMsg = 'Camera is currently in use by another application.';
      }
      setCameraError(errorMsg);
    }
  };

  // 3. Stop Stream and cleanup
  const stopCameraAndTracking = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (poseLandmarkerRef.current) {
      try {
        poseLandmarkerRef.current.close?.();
      } catch {
        // ignore
      }
      poseLandmarkerRef.current = null;
    }
  };

  // 4. Main Pose Detection & Skeleton Rendering Loop (Capped at 20 FPS)
  useEffect(() => {
    if (!isTrackingActive) return;

    let isActive = true;

    const renderLoop = (now: number) => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = poseLandmarkerRef.current;
      const analyzer = analyzerRef.current;

      if (
        video &&
        canvas &&
        landmarker &&
        analyzer &&
        video.readyState >= 2 &&
        !video.paused
      ) {
        // Enforce 20 FPS throttle (~50ms between detections)
        const elapsed = now - lastProcessTimeRef.current;
        if (elapsed >= 50) {
          lastProcessTimeRef.current = now;

          // Match canvas dimensions to video
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            try {
              const detectionResult = landmarker.detectForVideo(video, now);

              if (
                detectionResult.landmarks &&
                detectionResult.landmarks.length > 0
              ) {
                const rawLandmarks = detectionResult.landmarks[0];

                // Smooth landmark coordinates to remove camera jitter
                const smoothed = smoothLandmarks(
                  rawLandmarks,
                  prevLandmarksRef.current,
                  0.65
                );
                prevLandmarksRef.current = smoothed;

                // Process biomechanical state
                const res = analyzer.processFrame(smoothed, now);
                setAnalysis(res);

                // Draw smoothed skeleton over mirrored canvas
                drawPoseSkeleton(
                  ctx,
                  smoothed,
                  canvas.width,
                  canvas.height,
                  res.formStatus,
                  true // mirrored matching front-facing camera
                );

                // Check auto-finish
                if (res.shouldAutoFinish) {
                  isActive = false;
                  handleFinishSet();
                  return;
                }
              } else {
                const res = analyzer.processFrame([], now);
                setAnalysis(res);
              }
            } catch {
              // Gracefully handle frame skip
            }
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isActive = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isTrackingActive, handleFinishSet]);

  return (
    <div className="w-full space-y-6">
      {/* Privacy & Setup Guide Notice */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-indigo-500/20">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span>
            <strong>Setup Guide:</strong>{' '}
            {analyzerRef.current?.setupInstructions ||
              'Stand in frame with your full body visible in good lighting.'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Bicep Curl Arm Selector */}
          {isBicepCurl && (
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[10px] text-slate-500 font-semibold uppercase px-1">
                Track Arm:
              </span>
              <button
                type="button"
                onClick={() => handleToggleArm('left')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  bicepArm === 'left'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
                }`}
              >
                Left
              </button>
              <button
                type="button"
                onClick={() => handleToggleArm('right')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  bicepArm === 'right'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
                }`}
              >
                Right
              </button>
            </div>
          )}

          {/* Lunge Front Leg Selector */}
          {isLunge && (
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[10px] text-slate-500 font-semibold uppercase px-1">
                Front Leg:
              </span>
              {(['auto', 'left', 'right'] as const).map((leg) => (
                <button
                  key={leg}
                  type="button"
                  onClick={() => handleToggleLeg(leg)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize transition ${
                    lungeLeg === leg
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
                  }`}
                >
                  {leg}
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Your camera video stays on your device</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Video / Right Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mirrored Camera Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div
            className={`glass-panel rounded-2xl p-2 relative overflow-hidden bg-slate-950 border-2 transition-all duration-300 ${
              analysis?.formStatus === 'good'
                ? 'border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
                : analysis?.formStatus === 'warning'
                ? 'border-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                : 'border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.25)]'
            }`}
          >
            {/* Top State Badge Overlay */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white flex items-center space-x-1.5">
                <Camera className="w-3 h-3 text-cyan-400" />
                <span>
                  {exerciseName} · Set #{setNumber}
                </span>
              </span>

              <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider bg-slate-900/90 backdrop-blur-md border border-white/15 text-indigo-400">
                {analysis?.state || 'READY'}
              </span>
            </div>

            {/* Video & Skeleton Canvas Container */}
            <div className="aspect-[4/3] w-full relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
              {/* Mirrored Live Video */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover -scale-x-100"
              />

              {/* Overlaid Skeleton Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
              />

              {/* Loading State */}
              {isLoadingModel && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                  <h3 className="text-sm font-bold">Loading MediaPipe Pose Engine...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Initializing local on-device neural network
                  </p>
                </div>
              )}

              {/* Camera Error State */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                  <ShieldAlert className="w-12 h-12 text-red-400 mb-3" />
                  <h3 className="text-sm font-bold text-red-200">{cameraError}</h3>
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold cursor-pointer"
                    >
                      Retry Camera
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Switch to Manual Log
                    </button>
                  </div>
                </div>
              )}

              {/* Push-Up Plank Hold 1.5s Progress Overlay */}
              {analysis &&
                analysis.exerciseId === 'push_up' &&
                !analysis.isReady &&
                analysis.isBodyInFrame &&
                !isLoadingModel &&
                !cameraError && (
                  <div className="absolute inset-x-8 bottom-6 z-20 p-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 text-center text-white shadow-xl">
                    <div className="flex items-center justify-center space-x-2 text-xs font-bold text-indigo-400 mb-2">
                      <Timer className="w-4 h-4 animate-spin" />
                      <span>{analysis.latestMistake || 'Hold plank for 1.5s to start set'}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden max-w-xs mx-auto border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-150"
                        style={{
                          width: `${Math.round((analysis.readyProgress || 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* Plank 2.0s Stability Hold Countdown Overlay */}
              {analysis &&
                analysis.exerciseId === 'plank' &&
                !analysis.isReady &&
                analysis.isBodyInFrame &&
                !isLoadingModel &&
                !cameraError && (
                  <div className="absolute inset-x-8 bottom-6 z-20 p-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-center text-white shadow-xl">
                    <div className="flex items-center justify-center space-x-2 text-xs font-bold text-cyan-400 mb-2">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>{analysis.latestMistake || 'Hold plank position for 2s to start timer'}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden max-w-xs mx-auto border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150"
                        style={{
                          width: `${Math.round((analysis.readyProgress || 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {/* Body Out of Frame Warning */}
              {analysis &&
                !analysis.isBodyInFrame &&
                !isLoadingModel &&
                !cameraError && (
                  <div className="absolute inset-x-4 bottom-4 z-20 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold text-center flex items-center justify-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{analysis.bodyInFrameMessage}</span>
                  </div>
                )}
            </div>
          </div>

          {/* Action Buttons: Finish Set / Cancel */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleFinishSet}
              className="flex-1 max-w-xs inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isPlank
                  ? `Finish Set (${analysis?.holdDurationSeconds || 0}s hold)`
                  : `Finish Set (${analysis?.repCount || 0} reps)`}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Live Telemetry Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-6 border">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              <span>Live Form Telemetry</span>
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1" />
                20 FPS
              </span>
            </div>

            {/* Rep Counter or Large Hold Timer */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              {isPlank ? (
                <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
                  <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400">
                    {analysis?.holdDurationSeconds || 0}s
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {targetDurationSecs || 45}s
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1">
                    Hold Time
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                    {analysis?.repCount || 0}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      / {targetReps}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1">
                    Reps Completed
                  </div>
                </div>
              )}

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

            {/* Dynamic Biomechanical Live Angles */}
            <div className="space-y-4 mb-6">
              {/* Primary Metric */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    {analysis?.primaryMetric.name || 'Joint Angle'}
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

              {/* Secondary Metric */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    {analysis?.secondaryMetric.name || 'Alignment / Posture'}
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
                {analysis?.latestMistake ||
                  (analysis?.isReady
                    ? `Ready · Perform ${exerciseName}`
                    : 'Get into position')}
              </div>
            </div>
          </div>

          {/* Reserved Step 6 Area for 3D Character */}
          <div className="glass-panel rounded-2xl p-5 border border-dashed border-indigo-400/30 text-center py-6">
            <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              3D Character Muscle Highlight
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Reserved area for interactive Three.js 3D character (Coming in Step 6).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
