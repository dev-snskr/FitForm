// src/lib/pose/squatDetector.ts
// FitForm Squat Detector (re-exports SquatAnalyzer for backwards compatibility)

import { SquatAnalyzer, SquatState } from './analyzers/squatAnalyzer';
import { FormStatus, RepSummary, ExerciseAnalysisResult } from './types';

export type { SquatState, FormStatus, RepSummary };
export type SquatAnalysisResult = ExerciseAnalysisResult & {
  kneeAngle: number;
  torsoLean: number;
};

export { SquatAnalyzer as SquatDetector };
