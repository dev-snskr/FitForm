// src/lib/pose/analyzers/lungeAnalyzer.ts
// FitForm Lunge Biomechanical Analyzer
// Evaluates front knee depth, torso forward lean, knee/toe tracking, and tempo.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculateAngle,
  calculateTorsoLean,
  calculateKneeTravelPastToes,
} from '../angleMath';
import { LUNGE_CONFIG } from '../exerciseConfig';
import {
  IExerciseAnalyzer,
  ExerciseId,
  FormStatus,
  RepSummary,
  ExerciseAnalysisResult,
} from '../types';

export type LungeState = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export class LungeAnalyzer implements IExerciseAnalyzer {
  public readonly exerciseId: ExerciseId = 'lunge';
  public readonly exerciseName = 'Walking / Static Lunge';
  public readonly setupInstructions = LUNGE_CONFIG.SETUP_GUIDE;
  public readonly requiredLandmarks = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE,
    POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
  ];

  private legChoice: 'auto' | 'left' | 'right' = 'auto';
  private state: LungeState = 'STANDING';
  private repCount = 0;
  private completedReps: RepSummary[] = [];

  // Active rep tracking
  private descentStartTime = 0;
  private lowestFrontKneeAngleInRep = 180;
  private maxTorsoLeanInRep = 0;
  private detectedFrontLeg: 'left' | 'right' = 'right';
  private currentRepMistakes = new Set<string>();

  // Overall telemetry
  private latestMistake: string | null = null;
  private formStatus: FormStatus = 'good';
  private lastMovementTime = 0;
  private shouldAutoFinish = false;
  private previousKneeAngle = 180;

  constructor(defaultLeg: 'auto' | 'left' | 'right' = 'auto') {
    this.legChoice = defaultLeg;
    this.reset();
  }

  public setLegChoice(leg: 'auto' | 'left' | 'right'): void {
    this.legChoice = leg;
    this.reset();
  }

  public getLegChoice(): 'auto' | 'left' | 'right' {
    return this.legChoice;
  }

  public reset(): void {
    this.state = 'STANDING';
    this.repCount = 0;
    this.completedReps = [];
    this.descentStartTime = 0;
    this.lowestFrontKneeAngleInRep = 180;
    this.maxTorsoLeanInRep = 0;
    this.currentRepMistakes.clear();
    this.latestMistake = null;
    this.formStatus = 'good';
    this.lastMovementTime = 0;
    this.shouldAutoFinish = false;
    this.previousKneeAngle = 180;
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
      return this.buildResult(
        false,
        LUNGE_CONFIG.MESSAGES.OUT_OF_FRAME,
        180,
        0,
        'right'
      );
    }

    if (this.lastMovementTime === 0) {
      this.lastMovementTime = timestampMs;
    }

    // Determine body visibility
    const leftConf =
      ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility || 0)) /
      4;

    const rightConf =
      ((landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility || 0)) /
      4;

    const overallConf = Math.max(leftConf, rightConf);
    const isBodyInFrame = overallConf >= LUNGE_CONFIG.MIN_KEYPOINT_VISIBILITY;
    if (!isBodyInFrame) {
      this.formStatus = 'bad';
      return this.buildResult(
        false,
        LUNGE_CONFIG.MESSAGES.OUT_OF_FRAME,
        this.previousKneeAngle,
        0,
        'right'
      );
    }

    // Facing direction: check whether nose/toes are to the right or left of hips
    const nose = landmarks[POSE_LANDMARKS.NOSE];
    const hipRight = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const hipLeft = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const avgHipX = ((hipRight?.x || 0.5) + (hipLeft?.x || 0.5)) / 2;
    const facingRight = (nose?.x || 0.5) >= avgHipX;

    // Detect front leg from ankle positions or respect user choice
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    let frontLeg: 'left' | 'right' = 'right';
    if (this.legChoice === 'left' || this.legChoice === 'right') {
      frontLeg = this.legChoice;
    } else {
      // Auto: front ankle is further forward in facing direction
      if (facingRight) {
        frontLeg = (rightAnkle?.x || 0) >= (leftAnkle?.x || 0) ? 'right' : 'left';
      } else {
        frontLeg = (rightAnkle?.x || 0) <= (leftAnkle?.x || 0) ? 'right' : 'left';
      }
    }
    this.detectedFrontLeg = frontLeg;

    // Front leg body points
    const shoulder =
      landmarks[
        frontLeg === 'right'
          ? POSE_LANDMARKS.RIGHT_SHOULDER
          : POSE_LANDMARKS.LEFT_SHOULDER
      ];
    const hip =
      landmarks[
        frontLeg === 'right'
          ? POSE_LANDMARKS.RIGHT_HIP
          : POSE_LANDMARKS.LEFT_HIP
      ];
    const knee =
      landmarks[
        frontLeg === 'right'
          ? POSE_LANDMARKS.RIGHT_KNEE
          : POSE_LANDMARKS.LEFT_KNEE
      ];
    const ankle =
      landmarks[
        frontLeg === 'right'
          ? POSE_LANDMARKS.RIGHT_ANKLE
          : POSE_LANDMARKS.LEFT_ANKLE
      ];
    const toe =
      landmarks[
        frontLeg === 'right'
          ? POSE_LANDMARKS.RIGHT_FOOT_INDEX
          : POSE_LANDMARKS.LEFT_FOOT_INDEX
      ];

    // Biomechanics
    // 1. Front knee flexion angle (Hip -> Knee -> Ankle)
    const kneeAngle = calculateAngle(hip, knee, ankle);

    // 2. Torso lean from vertical
    const torsoLean = calculateTorsoLean(shoulder, hip);

    // Movement tracking
    const angleDelta = Math.abs(kneeAngle - this.previousKneeAngle);
    if (angleDelta > 2.0) {
      this.lastMovementTime = timestampMs;
    }
    this.previousKneeAngle = kneeAngle;

    // Inactivity auto-finish
    if (
      this.repCount >= 1 &&
      timestampMs - this.lastMovementTime >= LUNGE_CONFIG.AUTO_FINISH_INACTIVITY_MS
    ) {
      this.shouldAutoFinish = true;
    }

    // Check knee past toes only if foot landmark confidence is high
    const toeConf = toe?.visibility || 0;
    if (toeConf >= LUNGE_CONFIG.MIN_FOOT_VISIBILITY_FOR_BALANCE) {
      const kneePastToe = calculateKneeTravelPastToes(knee, toe, facingRight);
      if (kneePastToe > LUNGE_CONFIG.MAX_KNEE_PAST_TOE_RATIO) {
        this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.KNEE_PAST_TOES);
        this.latestMistake = LUNGE_CONFIG.MESSAGES.KNEE_PAST_TOES;
      }
    }

    // State Machine
    switch (this.state) {
      case 'STANDING':
        if (kneeAngle < LUNGE_CONFIG.LUNGE_TRIGGER_ANGLE) {
          this.state = 'DESCENDING';
          this.descentStartTime = timestampMs;
          this.lowestFrontKneeAngleInRep = kneeAngle;
          this.maxTorsoLeanInRep = torsoLean;
          this.currentRepMistakes.clear();
        }
        break;

      case 'DESCENDING':
        this.lowestFrontKneeAngleInRep = Math.min(
          this.lowestFrontKneeAngleInRep,
          kneeAngle
        );
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > LUNGE_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = LUNGE_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle <= LUNGE_CONFIG.LUNGE_DEPTH_KNEE_ANGLE_MAX) {
          this.state = 'BOTTOM';
        } else if (
          kneeAngle > this.lowestFrontKneeAngleInRep + 8 &&
          this.lowestFrontKneeAngleInRep < LUNGE_CONFIG.SHALLOW_LUNGE_DEPTH_LIMIT + 20
        ) {
          if (this.lowestFrontKneeAngleInRep > LUNGE_CONFIG.SHALLOW_LUNGE_DEPTH_LIMIT) {
            this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.NOT_DEEP_ENOUGH);
            this.latestMistake = LUNGE_CONFIG.MESSAGES.NOT_DEEP_ENOUGH;
          }
          this.state = 'ASCENDING';
        }
        break;

      case 'BOTTOM':
        this.lowestFrontKneeAngleInRep = Math.min(
          this.lowestFrontKneeAngleInRep,
          kneeAngle
        );
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > LUNGE_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = LUNGE_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle > this.lowestFrontKneeAngleInRep + 8) {
          this.state = 'ASCENDING';

          const descentDuration = timestampMs - this.descentStartTime;
          if (descentDuration < LUNGE_CONFIG.MIN_DESCENT_DURATION_MS) {
            this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.TOO_FAST);
            this.latestMistake = LUNGE_CONFIG.MESSAGES.TOO_FAST;
          }
        }
        break;

      case 'ASCENDING':
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > LUNGE_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = LUNGE_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle >= LUNGE_CONFIG.STANDING_KNEE_ANGLE_MIN) {
          this.state = 'STANDING';

          if (this.lowestFrontKneeAngleInRep > LUNGE_CONFIG.LUNGE_DEPTH_KNEE_ANGLE_MAX) {
            this.currentRepMistakes.add(LUNGE_CONFIG.MESSAGES.NOT_DEEP_ENOUGH);
            this.latestMistake = LUNGE_CONFIG.MESSAGES.NOT_DEEP_ENOUGH;
          }

          let repScore = 100;
          if (this.currentRepMistakes.has(LUNGE_CONFIG.MESSAGES.NOT_DEEP_ENOUGH)) {
            repScore -= LUNGE_CONFIG.DEDUCTIONS.NOT_DEEP_ENOUGH;
          }
          if (this.currentRepMistakes.has(LUNGE_CONFIG.MESSAGES.LEANING_FORWARD)) {
            repScore -= LUNGE_CONFIG.DEDUCTIONS.LEANING_FORWARD;
          }
          if (this.currentRepMistakes.has(LUNGE_CONFIG.MESSAGES.KNEE_PAST_TOES)) {
            repScore -= LUNGE_CONFIG.DEDUCTIONS.KNEE_PAST_TOES;
          }
          if (this.currentRepMistakes.has(LUNGE_CONFIG.MESSAGES.TOO_FAST)) {
            repScore -= LUNGE_CONFIG.DEDUCTIONS.TOO_FAST;
          }
          repScore = Math.max(40, repScore);

          this.repCount += 1;
          const descentDuration = timestampMs - this.descentStartTime;
          const mistakesArr = Array.from(this.currentRepMistakes);

          this.completedReps.push({
            repNumber: this.repCount,
            score: repScore,
            mistakes: mistakesArr,
            metrics: {
              lowestFrontKneeAngle: Math.round(this.lowestFrontKneeAngleInRep),
              maxTorsoLean: Math.round(this.maxTorsoLeanInRep),
            },
            durationMs: descentDuration,
          });

          if (mistakesArr.length === 0) {
            this.latestMistake = LUNGE_CONFIG.MESSAGES.CLEAN_FORM;
            this.formStatus = 'good';
          } else if (repScore >= 75) {
            this.formStatus = 'warning';
          } else {
            this.formStatus = 'bad';
          }
        }
        break;
    }

    return this.buildResult(true, null, kneeAngle, torsoLean, frontLeg);
  }

  private buildResult(
    isBodyInFrame: boolean,
    bodyInFrameMessage: string | null,
    kneeAngle: number,
    torsoLean: number,
    activeSide: 'left' | 'right'
  ): ExerciseAnalysisResult {
    const totalScore = this.getTotalScore();

    let dynamicFormStatus: FormStatus = 'good';
    if (!isBodyInFrame) {
      dynamicFormStatus = 'bad';
    } else if (
      this.state === 'DESCENDING' ||
      this.state === 'BOTTOM' ||
      this.state === 'ASCENDING'
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
      isReady: true,
      readyProgress: 1,
      primaryMetric: {
        name: 'Front Knee',
        value: Math.round(kneeAngle),
        unit: '°',
        targetDesc: 'target: <100°',
        percent: Math.min(100, Math.max(0, Math.round(kneeAngle / 1.8))),
      },
      secondaryMetric: {
        name: 'Torso Lean',
        value: Math.round(torsoLean),
        unit: '°',
        limitDesc: 'limit: <25°',
        percent: Math.min(100, Math.round((torsoLean / 45) * 100)),
        isWarning: torsoLean > LUNGE_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG,
      },
      activeSide,
      activeLeg: this.detectedFrontLeg,
      completedReps: this.completedReps,
      shouldAutoFinish: this.shouldAutoFinish,
    };
  }
}
