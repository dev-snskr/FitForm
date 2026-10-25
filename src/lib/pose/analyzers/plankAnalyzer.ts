// src/lib/pose/analyzers/plankAnalyzer.ts
// FitForm Forearm / Full Plank Biomechanical Analyzer
// Evaluates timed holds, 2-second stability activation, body alignment, and live form scoring.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculatePlankAlignment,
  calculateTorsoLean,
} from '../angleMath';
import { PLANK_CONFIG } from '../exerciseConfig';
import {
  IExerciseAnalyzer,
  ExerciseId,
  FormStatus,
  RepSummary,
  ExerciseAnalysisResult,
} from '../types';

export type PlankState =
  | 'GET_READY'
  | 'HOLD_STABILITY'
  | 'HOLDING'
  | 'COMPLETED';

export class PlankAnalyzer implements IExerciseAnalyzer {
  public readonly exerciseId: ExerciseId = 'plank';
  public readonly exerciseName = 'Forearm Plank';
  public readonly setupInstructions = PLANK_CONFIG.SETUP_GUIDE;
  public readonly isTimedHold = true;
  public readonly requiredLandmarks = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
    POSE_LANDMARKS.NOSE,
  ];

  private state: PlankState = 'GET_READY';
  private targetDurationSeconds = PLANK_CONFIG.DEFAULT_TARGET_SECONDS;

  // Stability hold before timer start (2.0s)
  private stabilityStartTime: number | null = null;
  private isTimerActive = false;

  // Active timed hold tracking
  private holdStartTime = 0;
  private elapsedHoldSeconds = 0;
  private totalHoldFrames = 0;
  private goodHoldFrames = 0;
  private dismountStartTime: number | null = null;

  // Mistake history
  private currentMistakes = new Set<string>();
  private allSessionMistakes = new Set<string>();
  private latestMistake: string | null = null;
  private formStatus: FormStatus = 'good';
  private shouldAutoFinish = false;
  private lastTimestamp = 0;

  constructor(targetSeconds: number = PLANK_CONFIG.DEFAULT_TARGET_SECONDS) {
    this.targetDurationSeconds = targetSeconds;
    this.reset();
  }

  public setTargetDuration(seconds: number): void {
    this.targetDurationSeconds = Math.max(5, seconds);
  }

  public getTargetDuration(): number {
    return this.targetDurationSeconds;
  }

  public getHoldDurationSeconds(): number {
    return this.elapsedHoldSeconds;
  }

  public reset(): void {
    this.state = 'GET_READY';
    this.stabilityStartTime = null;
    this.isTimerActive = false;
    this.holdStartTime = 0;
    this.elapsedHoldSeconds = 0;
    this.totalHoldFrames = 0;
    this.goodHoldFrames = 0;
    this.dismountStartTime = null;
    this.currentMistakes.clear();
    this.allSessionMistakes.clear();
    this.latestMistake = null;
    this.formStatus = 'good';
    this.shouldAutoFinish = false;
    this.lastTimestamp = 0;
  }

  public getRepCount(): number {
    // For plank, rep count is 1 completed hold set (or elapsed seconds)
    return this.elapsedHoldSeconds >= 5 ? 1 : 0;
  }

  public getTotalScore(): number {
    if (this.totalHoldFrames === 0) return 100;
    const ratio = this.goodHoldFrames / this.totalHoldFrames;
    return Math.max(40, Math.round(ratio * 100));
  }

  public getCompletedReps(): RepSummary[] {
    return [
      {
        repNumber: 1,
        score: this.getTotalScore(),
        mistakes: Array.from(this.allSessionMistakes),
        metrics: {
          holdDurationSeconds: this.elapsedHoldSeconds,
          targetDurationSeconds: this.targetDurationSeconds,
        },
        durationMs: this.elapsedHoldSeconds * 1000,
      },
    ];
  }

  public getMistakesSummary(): string[] {
    return Array.from(this.allSessionMistakes);
  }

  public processFrame(
    landmarks: LandmarkPoint[],
    timestampMs: number = Date.now()
  ): ExerciseAnalysisResult {
    this.lastTimestamp = timestampMs;

    if (!landmarks || landmarks.length < 33) {
      return this.buildResult(
        false,
        PLANK_CONFIG.MESSAGES.OUT_OF_FRAME,
        180,
        'left',
        0
      );
    }

    // Determine active side based on visibility
    const leftConf =
      ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility || 0)) /
      3;

    const rightConf =
      ((landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility || 0)) /
      3;

    const activeSide: 'left' | 'right' = rightConf >= leftConf ? 'right' : 'left';
    const activeConf = activeSide === 'right' ? rightConf : leftConf;

    // Body in frame check
    const isBodyInFrame = activeConf >= PLANK_CONFIG.MIN_KEYPOINT_VISIBILITY;
    if (!isBodyInFrame) {
      this.formStatus = 'bad';
      if (this.isTimerActive) {
        if (this.dismountStartTime === null) {
          this.dismountStartTime = timestampMs;
        }
        const dismountElapsed = timestampMs - this.dismountStartTime;
        if (dismountElapsed >= PLANK_CONFIG.DISMOUNT_INACTIVITY_LIMIT_MS) {
          this.state = 'COMPLETED';
          this.shouldAutoFinish = true;
        }
      }
      return this.buildResult(
        false,
        PLANK_CONFIG.MESSAGES.OUT_OF_FRAME,
        180,
        activeSide,
        0
      );
    }

    // Key points
    const shoulder =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_SHOULDER
          : POSE_LANDMARKS.LEFT_SHOULDER
      ];
    const hip =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_HIP
          : POSE_LANDMARKS.LEFT_HIP
      ];
    const ankle =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_ANKLE
          : POSE_LANDMARKS.LEFT_ANKLE
      ];
    const nose = landmarks[POSE_LANDMARKS.NOSE];

    // Biomechanics
    // 1. Body alignment angle (Shoulder -> Hip -> Ankle)
    const alignment = calculatePlankAlignment(shoulder, hip, ankle);
    const alignmentAngle = alignment.angle;

    // 2. Prone orientation check (horizontal on floor)
    const torsoLean = calculateTorsoLean(shoulder, hip);
    const isProne = torsoLean >= PLANK_CONFIG.PLANK_HORIZONTAL_TOLERANCE_DEG;

    // 3. Head dropping check (if nose confidence is high)
    const noseConf = nose?.visibility || 0;
    const isHeadDropping =
      noseConf >= PLANK_CONFIG.MIN_HEAD_VISIBILITY &&
      nose.y > shoulder.y + 0.12;

    // Plank posture validation (user is prone and not bent completely double)
    const inPlankPosture = isProne && alignmentAngle >= 130;

    // 1. Initial 2.0s Stability Hold Detection
    let readyProgress = this.isTimerActive ? 1 : 0;

    if (!this.isTimerActive) {
      if (inPlankPosture && alignmentAngle >= PLANK_CONFIG.BODY_ALIGNMENT_MIN_ANGLE - 5) {
        if (this.stabilityStartTime === null) {
          this.stabilityStartTime = timestampMs;
          this.state = 'HOLD_STABILITY';
          this.latestMistake = PLANK_CONFIG.MESSAGES.HOLD_PLANK;
        }

        const stableDuration = timestampMs - this.stabilityStartTime;
        readyProgress = Math.min(
          1,
          stableDuration / PLANK_CONFIG.STABILITY_HOLD_START_MS
        );

        if (stableDuration >= PLANK_CONFIG.STABILITY_HOLD_START_MS) {
          this.isTimerActive = true;
          this.state = 'HOLDING';
          this.holdStartTime = timestampMs;
          this.latestMistake = PLANK_CONFIG.MESSAGES.HOLDING_GOOD;
          this.formStatus = 'good';
        }
      } else {
        this.stabilityStartTime = null;
        this.state = 'GET_READY';
        this.latestMistake = PLANK_CONFIG.MESSAGES.HOLD_PLANK;
        readyProgress = 0;
      }

      return this.buildResult(
        true,
        null,
        alignmentAngle,
        activeSide,
        readyProgress
      );
    }

    // 2. Active Timed Hold Phase
    if (this.isTimerActive && this.state === 'HOLDING') {
      this.currentMistakes.clear();

      if (inPlankPosture) {
        this.dismountStartTime = null;

        // Alignment mistake checks
        if (alignment.deviation === 'sagging') {
          this.currentMistakes.add(PLANK_CONFIG.MESSAGES.HIPS_SAGGING);
          this.allSessionMistakes.add(PLANK_CONFIG.MESSAGES.HIPS_SAGGING);
          this.latestMistake = PLANK_CONFIG.MESSAGES.HIPS_SAGGING;
        } else if (alignment.deviation === 'high') {
          this.currentMistakes.add(PLANK_CONFIG.MESSAGES.HIPS_TOO_HIGH);
          this.allSessionMistakes.add(PLANK_CONFIG.MESSAGES.HIPS_TOO_HIGH);
          this.latestMistake = PLANK_CONFIG.MESSAGES.HIPS_TOO_HIGH;
        }

        // Head drop mistake
        if (isHeadDropping) {
          this.currentMistakes.add(PLANK_CONFIG.MESSAGES.HEAD_DROPPING);
          this.allSessionMistakes.add(PLANK_CONFIG.MESSAGES.HEAD_DROPPING);
          this.latestMistake = PLANK_CONFIG.MESSAGES.HEAD_DROPPING;
        }

        // Frame scoring ratio
        this.totalHoldFrames += 1;
        if (this.currentMistakes.size === 0) {
          this.goodHoldFrames += 1;
          this.latestMistake = PLANK_CONFIG.MESSAGES.HOLDING_GOOD;
          this.formStatus = 'good';
        } else {
          this.formStatus = this.currentMistakes.size > 1 ? 'bad' : 'warning';
        }

        // Update elapsed hold seconds
        const elapsedMs = timestampMs - this.holdStartTime;
        this.elapsedHoldSeconds = Math.floor(elapsedMs / 1000);

        // Check if target duration is reached
        if (this.elapsedHoldSeconds >= this.targetDurationSeconds) {
          this.state = 'COMPLETED';
          this.latestMistake = PLANK_CONFIG.MESSAGES.COMPLETED;
          this.shouldAutoFinish = true;
        }
      } else {
        // User broke plank posture during hold
        if (this.dismountStartTime === null) {
          this.dismountStartTime = timestampMs;
        }

        const dismountElapsed = timestampMs - this.dismountStartTime;
        if (dismountElapsed >= PLANK_CONFIG.DISMOUNT_INACTIVITY_LIMIT_MS) {
          // Dismounted for >3 seconds: auto finish set
          this.state = 'COMPLETED';
          this.shouldAutoFinish = true;
        }
      }
    }

    return this.buildResult(
      true,
      null,
      alignmentAngle,
      activeSide,
      1
    );
  }

  private buildResult(
    isBodyInFrame: boolean,
    bodyInFrameMessage: string | null,
    alignmentAngle: number,
    activeSide: 'left' | 'right',
    readyProgress: number
  ): ExerciseAnalysisResult {
    const totalScore = this.getTotalScore();

    return {
      exerciseId: this.exerciseId,
      exerciseName: this.exerciseName,
      state: this.state,
      repCount: this.elapsedHoldSeconds,
      currentScore: totalScore,
      latestMistake: this.latestMistake,
      formStatus: isBodyInFrame ? this.formStatus : 'bad',
      isBodyInFrame,
      bodyInFrameMessage,
      isReady: this.isTimerActive,
      readyProgress,
      isTimerActive: this.isTimerActive,
      isTimedHold: true,
      holdDurationSeconds: this.elapsedHoldSeconds,
      targetDurationSeconds: this.targetDurationSeconds,
      primaryMetric: {
        name: 'Plank Hold',
        value: this.elapsedHoldSeconds,
        unit: 's',
        targetDesc: `target: ${this.targetDurationSeconds}s`,
        percent: Math.min(
          100,
          Math.round((this.elapsedHoldSeconds / this.targetDurationSeconds) * 100)
        ),
      },
      secondaryMetric: {
        name: 'Body Alignment',
        value: Math.round(alignmentAngle),
        unit: '°',
        limitDesc: 'straight: >165°',
        percent: Math.min(100, Math.round((alignmentAngle / 180) * 100)),
        isWarning: alignmentAngle < PLANK_CONFIG.BODY_ALIGNMENT_MIN_ANGLE,
      },
      activeSide,
      completedReps: this.getCompletedReps(),
      shouldAutoFinish: this.shouldAutoFinish,
    };
  }
}
