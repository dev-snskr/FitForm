// src/lib/pose/types.ts
// FitForm Pose Biomechanics Types & Analyzer Interfaces

import { LandmarkPoint } from './angleMath';

export type ExerciseId = 'squat' | 'push_up' | 'bicep_curl';
export type FormStatus = 'good' | 'warning' | 'bad';

export interface RepSummary {
  repNumber: number;
  score: number;
  mistakes: string[];
  metrics: Record<string, number>;
  durationMs: number;
}

export interface MetricDisplay {
  name: string;
  value: number;
  unit: string;
  targetDesc?: string;
  limitDesc?: string;
  percent: number; // 0 to 100 for visual progress bar
  isWarning?: boolean;
}

export interface ExerciseAnalysisResult {
  exerciseId: ExerciseId;
  exerciseName: string;
  state: string; // e.g. 'STANDING', 'PLANK_HOLD', 'DESCENDING', 'BOTTOM', 'ASCENDING', 'READY', 'CURLED'
  repCount: number;
  currentScore: number; // 0 to 100
  latestMistake: string | null;
  formStatus: FormStatus;
  isBodyInFrame: boolean;
  bodyInFrameMessage: string | null;
  isReady: boolean;
  readyProgress?: number; // 0 to 1 (for 1.5s plank stability hold)
  primaryMetric: MetricDisplay;
  secondaryMetric: MetricDisplay;
  activeSide: 'left' | 'right';
  completedReps: RepSummary[];
  shouldAutoFinish: boolean;
}

export interface IExerciseAnalyzer {
  readonly exerciseId: ExerciseId;
  readonly exerciseName: string;
  readonly setupInstructions: string;
  readonly requiredLandmarks: number[];
  
  // Optional arm choice for single-arm exercises like bicep curl
  setArmChoice?(arm: 'left' | 'right'): void;
  getArmChoice?(): 'left' | 'right';

  processFrame(landmarks: LandmarkPoint[], timestampMs: number): ExerciseAnalysisResult;
  reset(): void;
  getRepCount(): number;
  getTotalScore(): number;
  getCompletedReps(): RepSummary[];
  getMistakesSummary(): string[];
}
