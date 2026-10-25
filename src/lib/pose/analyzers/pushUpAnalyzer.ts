// src/lib/pose/analyzers/pushUpAnalyzer.ts
// FitForm Push-Up Biomechanical Analyzer
// Evaluates elbow depth, body line alignment (sagging/piking), tempo, and plank stability.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculateAngle,
  calculatePlankAlignment,
  calculateTorsoLean,
} from '../angleMath';
import { PUSH_UP_CONFIG } from '../exerciseConfig';
import {
  IExerciseAnalyzer,
  ExerciseId,
  FormStatus,
  RepSummary,
  ExerciseAnalysisResult,
} from '../types';

export type PushUpState =
  | 'GET_READY'
  | 'HOLD_PLANK'
  | 'READY'
  | 'LOWERING'
  | 'BOTTOM'
  | 'PUSHING_UP';

export class PushUpAnalyzer implements IExerciseAnalyzer {
  public readonly exerciseId: ExerciseId = 'push_up';
  public readonly exerciseName = 'Push-Up';
  public readonly setupInstructions = PUSH_UP_CONFIG.SETUP_GUIDE;
  public readonly requiredLandmarks = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST,
    POSE_LANDMARKS.RIGHT_WRIST,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
  ];

  private state: PushUpState = 'GET_READY';
  private repCount = 0;
  private completedReps: RepSummary[] = [];

  // Plank stability hold
  private plankHoldStartTime: number | null = null;
  private isReady = false;

  // Active rep tracking
  private descentStartTime = 0;
  private lowestElbowAngleInRep = 180;
  private worstAlignmentAngleInRep = 180;
  private currentRepMistakes = new Set<string>();

  // Overall telemetry
  private latestMistake: string | null = null;
  private formStatus: FormStatus = 'good';
  private lastMovementTime = 0;
  private shouldAutoFinish = false;
  private previousElbowAngle = 180;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.state = 'GET_READY';
    this.repCount = 0;
    this.completedReps = [];
    this.plankHoldStartTime = null;
    this.isReady = false;
    this.descentStartTime = 0;
    this.lowestElbowAngleInRep = 180;
    this.worstAlignmentAngleInRep = 180;
    this.currentRepMistakes.clear();
    this.latestMistake = null;
    this.formStatus = 'good';
    this.lastMovementTime = 0;
    this.shouldAutoFinish = false;
    this.previousElbowAngle = 180;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getTotalScore(): number {
    if (this.completedReps.length === 0) return 100;
    const sum = this.completedReps.reduce((s, r) => s + r.score, 0);
    return Math.round(sum / this.completedReps.length);
  }

  public getCompletedReps(): RepSummary[] {
    return [...this.completedReps];
  }

  public getMistakesSummary(): string[] {
    const set = new Set<string>();
    this.completedReps.forEach((r) => r.mistakes.forEach((m) => set.add(m)));
    return Array.from(set);
  }

  public processFrame(
    landmarks: LandmarkPoint[],
    timestampMs: number = Date.now()
  ): ExerciseAnalysisResult {
    if (!landmarks || landmarks.length < 33) {
      return this.buildResult(false, PUSH_UP_CONFIG.MESSAGES.OUT_OF_FRAME, 180, 180, 'left', 0);
    }

    if (this.lastMovementTime === 0) {
      this.lastMovementTime = timestampMs;
    }

    // Determine active side based on visibility of key landmarks
    const leftConf =
      ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_ELBOW].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_WRIST].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility || 0)) /
      5;

    const rightConf =
      ((landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_ELBOW].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_WRIST].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility || 0)) /
      5;

    const activeSide: 'left' | 'right' = rightConf > leftConf ? 'right' : 'left';
    const activeConfidence = activeSide === 'right' ? rightConf : leftConf;

    // Body in frame check
    const isBodyInFrame = activeConfidence >= PUSH_UP_CONFIG.MIN_KEYPOINT_VISIBILITY;
    if (!isBodyInFrame) {
      this.formStatus = 'bad';
      return this.buildResult(
        false,
        PUSH_UP_CONFIG.MESSAGES.OUT_OF_FRAME,
        this.previousElbowAngle,
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
    const elbow =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_ELBOW
          : POSE_LANDMARKS.LEFT_ELBOW
      ];
    const wrist =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_WRIST
          : POSE_LANDMARKS.LEFT_WRIST
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

    // Calculate Biomechanics
    // 1. Elbow flexion angle (Shoulder -> Elbow -> Wrist)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    // 2. Body line alignment (Shoulder -> Hip -> Ankle)
    const alignment = calculatePlankAlignment(shoulder, hip, ankle);
    const alignmentAngle = alignment.angle;

    // 3. Torso horizontal lean check (is the user prone/horizontal on the ground)
    const torsoLean = calculateTorsoLean(shoulder, hip);
    const isHorizontalPlank = torsoLean >= PUSH_UP_CONFIG.PLANK_HORIZONTAL_TOLERANCE_DEG;

    // Movement tracking
    const angleDelta = Math.abs(elbowAngle - this.previousElbowAngle);
    if (angleDelta > 2.0) {
      this.lastMovementTime = timestampMs;
    }
    this.previousElbowAngle = elbowAngle;

    // Inactivity auto-finish
    if (
      this.repCount >= 1 &&
      timestampMs - this.lastMovementTime >= PUSH_UP_CONFIG.AUTO_FINISH_INACTIVITY_MS
    ) {
      this.shouldAutoFinish = true;
    }

    // Stability & Ready Detection (1.5 seconds stable plank hold)
    let readyProgress = this.isReady ? 1 : 0;

    if (!this.isReady) {
      const inPlankPosture =
        isHorizontalPlank &&
        elbowAngle >= PUSH_UP_CONFIG.EXTENDED_ELBOW_ANGLE_MIN - 10 &&
        alignmentAngle >= PUSH_UP_CONFIG.BODY_ALIGNMENT_MIN_ANGLE - 10;

      if (inPlankPosture) {
        if (this.plankHoldStartTime === null) {
          this.plankHoldStartTime = timestampMs;
          this.state = 'HOLD_PLANK';
          this.latestMistake = PUSH_UP_CONFIG.MESSAGES.HOLD_PLANK;
        }

        const holdDuration = timestampMs - this.plankHoldStartTime;
        readyProgress = Math.min(1, holdDuration / PUSH_UP_CONFIG.PLANK_READY_HOLD_MS);

        if (holdDuration >= PUSH_UP_CONFIG.PLANK_READY_HOLD_MS) {
          this.isReady = true;
          this.state = 'READY';
          this.latestMistake = PUSH_UP_CONFIG.MESSAGES.READY;
          this.formStatus = 'good';
        }
      } else {
        // Lost plank posture before holding 1.5s
        this.plankHoldStartTime = null;
        this.state = 'GET_READY';
        this.latestMistake = PUSH_UP_CONFIG.MESSAGES.HOLD_PLANK;
        readyProgress = 0;
      }

      return this.buildResult(
        true,
        null,
        elbowAngle,
        alignmentAngle,
        activeSide,
        readyProgress
      );
    }

    // Once ready, check for body alignment mistakes during push-up reps
    if (alignment.deviation === 'sagging') {
      this.currentRepMistakes.add(PUSH_UP_CONFIG.MESSAGES.HIPS_SAGGING);
      this.latestMistake = PUSH_UP_CONFIG.MESSAGES.HIPS_SAGGING;
    } else if (alignment.deviation === 'high') {
      this.currentRepMistakes.add(PUSH_UP_CONFIG.MESSAGES.HIPS_TOO_HIGH);
      this.latestMistake = PUSH_UP_CONFIG.MESSAGES.HIPS_TOO_HIGH;
    }

    // Push-Up State Machine
    switch (this.state) {
      case 'READY':
        if (elbowAngle < PUSH_UP_CONFIG.LOWERING_TRIGGER_ANGLE) {
          this.state = 'LOWERING';
          this.descentStartTime = timestampMs;
          this.lowestElbowAngleInRep = elbowAngle;
          this.worstAlignmentAngleInRep = alignmentAngle;
          this.currentRepMistakes.clear();
        }
        break;

      case 'LOWERING':
        this.lowestElbowAngleInRep = Math.min(this.lowestElbowAngleInRep, elbowAngle);
        this.worstAlignmentAngleInRep = Math.min(
          this.worstAlignmentAngleInRep,
          alignmentAngle
        );

        if (elbowAngle <= PUSH_UP_CONFIG.FULL_DEPTH_ELBOW_ANGLE_MAX) {
          this.state = 'BOTTOM';
        } else if (elbowAngle > this.lowestElbowAngleInRep + 8) {
          // Started ascending early without reaching full depth
          if (this.lowestElbowAngleInRep > PUSH_UP_CONFIG.SHALLOW_ELBOW_LIMIT) {
            this.currentRepMistakes.add(PUSH_UP_CONFIG.MESSAGES.GO_LOWER);
            this.latestMistake = PUSH_UP_CONFIG.MESSAGES.GO_LOWER;
          }
          this.state = 'PUSHING_UP';
        }
        break;

      case 'BOTTOM':
        this.lowestElbowAngleInRep = Math.min(this.lowestElbowAngleInRep, elbowAngle);
        this.worstAlignmentAngleInRep = Math.min(
          this.worstAlignmentAngleInRep,
          alignmentAngle
        );

        if (elbowAngle > this.lowestElbowAngleInRep + 8) {
          this.state = 'PUSHING_UP';

          const loweringDuration = timestampMs - this.descentStartTime;
          if (loweringDuration < PUSH_UP_CONFIG.MIN_DESCENT_DURATION_MS) {
            this.currentRepMistakes.add(PUSH_UP_CONFIG.MESSAGES.TOO_FAST);
            this.latestMistake = PUSH_UP_CONFIG.MESSAGES.TOO_FAST;
          }
        }
        break;

      case 'PUSHING_UP':
        this.worstAlignmentAngleInRep = Math.min(
          this.worstAlignmentAngleInRep,
          alignmentAngle
        );

        if (elbowAngle >= PUSH_UP_CONFIG.EXTENDED_ELBOW_ANGLE_MIN) {
          this.state = 'READY';

          if (this.lowestElbowAngleInRep > PUSH_UP_CONFIG.SHALLOW_ELBOW_LIMIT) {
            this.currentRepMistakes.add(PUSH_UP_CONFIG.MESSAGES.GO_LOWER);
            this.latestMistake = PUSH_UP_CONFIG.MESSAGES.GO_LOWER;
          }

          // Calculate rep score
          let repScore = 100;
          if (this.currentRepMistakes.has(PUSH_UP_CONFIG.MESSAGES.GO_LOWER)) {
            repScore -= PUSH_UP_CONFIG.DEDUCTIONS.GO_LOWER;
          }
          if (this.currentRepMistakes.has(PUSH_UP_CONFIG.MESSAGES.HIPS_SAGGING)) {
            repScore -= PUSH_UP_CONFIG.DEDUCTIONS.HIPS_SAGGING;
          }
          if (this.currentRepMistakes.has(PUSH_UP_CONFIG.MESSAGES.HIPS_TOO_HIGH)) {
            repScore -= PUSH_UP_CONFIG.DEDUCTIONS.HIPS_TOO_HIGH;
          }
          if (this.currentRepMistakes.has(PUSH_UP_CONFIG.MESSAGES.TOO_FAST)) {
            repScore -= PUSH_UP_CONFIG.DEDUCTIONS.TOO_FAST;
          }
          repScore = Math.max(40, repScore);

          this.repCount += 1;
          const loweringDuration = timestampMs - this.descentStartTime;
          const mistakesArr = Array.from(this.currentRepMistakes);

          this.completedReps.push({
            repNumber: this.repCount,
            score: repScore,
            mistakes: mistakesArr,
            metrics: {
              lowestElbowAngle: Math.round(this.lowestElbowAngleInRep),
              worstAlignmentAngle: Math.round(this.worstAlignmentAngleInRep),
            },
            durationMs: loweringDuration,
          });

          if (mistakesArr.length === 0) {
            this.latestMistake = PUSH_UP_CONFIG.MESSAGES.CLEAN_FORM;
            this.formStatus = 'good';
          } else if (repScore >= 75) {
            this.formStatus = 'warning';
          } else {
            this.formStatus = 'bad';
          }
        }
        break;
    }

    return this.buildResult(
      true,
      null,
      elbowAngle,
      alignmentAngle,
      activeSide,
      1
    );
  }

  private buildResult(
    isBodyInFrame: boolean,
    bodyInFrameMessage: string | null,
    elbowAngle: number,
    alignmentAngle: number,
    activeSide: 'left' | 'right',
    readyProgress: number
  ): ExerciseAnalysisResult {
    const totalScore = this.getTotalScore();

    let dynamicFormStatus: FormStatus = 'good';
    if (!isBodyInFrame) {
      dynamicFormStatus = 'bad';
    } else if (
      this.state === 'LOWERING' ||
      this.state === 'BOTTOM' ||
      this.state === 'PUSHING_UP'
    ) {
      if (this.currentRepMistakes.size > 0) {
        dynamicFormStatus = this.currentRepMistakes.size > 1 ? 'bad' : 'warning';
      }
    } else {
      dynamicFormStatus = this.formStatus;
    }

    return {
      exerciseId: this.exerciseId,
      exerciseName: this.exerciseName,
      state: this.state,
      repCount: this.repCount,
      currentScore: totalScore,
      latestMistake: this.latestMistake,
      formStatus: dynamicFormStatus,
      isBodyInFrame,
      bodyInFrameMessage,
      isReady: this.isReady,
      readyProgress,
      primaryMetric: {
        name: 'Elbow Angle',
        value: Math.round(elbowAngle),
        unit: '°',
        targetDesc: 'target: <90°',
        percent: Math.min(100, Math.max(0, Math.round(elbowAngle / 1.8))),
      },
      secondaryMetric: {
        name: 'Body Alignment',
        value: Math.round(alignmentAngle),
        unit: '°',
        limitDesc: 'limit: >160°',
        percent: Math.min(100, Math.round((alignmentAngle / 180) * 100)),
        isWarning: alignmentAngle < PUSH_UP_CONFIG.BODY_ALIGNMENT_MIN_ANGLE,
      },
      activeSide,
      completedReps: this.completedReps,
      shouldAutoFinish: this.shouldAutoFinish,
    };
  }
}
