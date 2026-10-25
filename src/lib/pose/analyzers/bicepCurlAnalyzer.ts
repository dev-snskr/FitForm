// src/lib/pose/analyzers/bicepCurlAnalyzer.ts
// FitForm Bicep Curl Biomechanical Analyzer
// Evaluates elbow curl height, bottom extension, body/arm swinging, and curl tempo.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculateAngle,
  calculateTorsoLean,
  calculateUpperArmAngle,
} from '../angleMath';
import { BICEP_CURL_CONFIG } from '../exerciseConfig';
import {
  IExerciseAnalyzer,
  ExerciseId,
  FormStatus,
  RepSummary,
  ExerciseAnalysisResult,
} from '../types';

export type BicepCurlState =
  | 'READY'
  | 'CURLING'
  | 'TOP'
  | 'LOWERING';

export class BicepCurlAnalyzer implements IExerciseAnalyzer {
  public readonly exerciseId: ExerciseId = 'bicep_curl';
  public readonly exerciseName = 'Bicep Curl';
  public readonly setupInstructions = BICEP_CURL_CONFIG.SETUP_GUIDE;

  private chosenArm: 'left' | 'right' = 'right';
  private state: BicepCurlState = 'READY';
  private repCount = 0;
  private completedReps: RepSummary[] = [];

  // Active rep tracking
  private curlStartTime = 0;
  private lowestElbowAngleInRep = 180;
  private highestExtensionAngleInRep = 0;
  private maxTorsoLeanInRep = 0;
  private maxUpperArmSwingInRep = 0;
  private currentRepMistakes = new Set<string>();

  // Telemetry
  private latestMistake: string | null = null;
  private formStatus: FormStatus = 'good';
  private lastMovementTime = 0;
  private shouldAutoFinish = false;
  private previousElbowAngle = 180;

  constructor(defaultArm: 'left' | 'right' = 'right') {
    this.chosenArm = defaultArm;
    this.reset();
  }

  public setArmChoice(arm: 'left' | 'right'): void {
    this.chosenArm = arm;
    this.reset();
  }

  public getArmChoice(): 'left' | 'right' {
    return this.chosenArm;
  }

  public get requiredLandmarks(): number[] {
    return this.chosenArm === 'right'
      ? [
          POSE_LANDMARKS.RIGHT_SHOULDER,
          POSE_LANDMARKS.RIGHT_ELBOW,
          POSE_LANDMARKS.RIGHT_WRIST,
          POSE_LANDMARKS.RIGHT_HIP,
        ]
      : [
          POSE_LANDMARKS.LEFT_SHOULDER,
          POSE_LANDMARKS.LEFT_ELBOW,
          POSE_LANDMARKS.LEFT_WRIST,
          POSE_LANDMARKS.LEFT_HIP,
        ];
  }

  public reset(): void {
    this.state = 'READY';
    this.repCount = 0;
    this.completedReps = [];
    this.curlStartTime = 0;
    this.lowestElbowAngleInRep = 180;
    this.highestExtensionAngleInRep = 180;
    this.maxTorsoLeanInRep = 0;
    this.maxUpperArmSwingInRep = 0;
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
      return this.buildResult(
        false,
        BICEP_CURL_CONFIG.MESSAGES.OUT_OF_FRAME,
        180,
        0,
        this.chosenArm
      );
    }

    if (this.lastMovementTime === 0) {
      this.lastMovementTime = timestampMs;
    }

    const arm = this.chosenArm;
    const shoulderIdx =
      arm === 'right'
        ? POSE_LANDMARKS.RIGHT_SHOULDER
        : POSE_LANDMARKS.LEFT_SHOULDER;
    const elbowIdx =
      arm === 'right'
        ? POSE_LANDMARKS.RIGHT_ELBOW
        : POSE_LANDMARKS.LEFT_ELBOW;
    const wristIdx =
      arm === 'right'
        ? POSE_LANDMARKS.RIGHT_WRIST
        : POSE_LANDMARKS.LEFT_WRIST;
    const hipIdx =
      arm === 'right'
        ? POSE_LANDMARKS.RIGHT_HIP
        : POSE_LANDMARKS.LEFT_HIP;

    const shoulder = landmarks[shoulderIdx];
    const elbow = landmarks[elbowIdx];
    const wrist = landmarks[wristIdx];
    const hip = landmarks[hipIdx];

    // Visibility confidence
    const armConfidence =
      ((shoulder?.visibility || 0) +
        (elbow?.visibility || 0) +
        (wrist?.visibility || 0) +
        (hip?.visibility || 0)) /
      4;

    const isBodyInFrame = armConfidence >= BICEP_CURL_CONFIG.MIN_KEYPOINT_VISIBILITY;
    if (!isBodyInFrame) {
      this.formStatus = 'bad';
      return this.buildResult(
        false,
        BICEP_CURL_CONFIG.MESSAGES.OUT_OF_FRAME,
        this.previousElbowAngle,
        0,
        arm
      );
    }

    // Biomechanics
    // 1. Elbow angle: Shoulder -> Elbow -> Wrist (vertex at elbow)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    // 2. Torso lean from vertical
    const torsoLean = calculateTorsoLean(shoulder, hip);

    // 3. Upper arm deviation from vertical
    const upperArmAngle = calculateUpperArmAngle(shoulder, elbow);

    // Movement tracking
    const angleDelta = Math.abs(elbowAngle - this.previousElbowAngle);
    if (angleDelta > 2.0) {
      this.lastMovementTime = timestampMs;
    }
    this.previousElbowAngle = elbowAngle;

    // Inactivity auto-finish
    if (
      this.repCount >= 1 &&
      timestampMs - this.lastMovementTime >= BICEP_CURL_CONFIG.AUTO_FINISH_INACTIVITY_MS
    ) {
      this.shouldAutoFinish = true;
    }

    // Check swinging mistakes
    if (
      torsoLean > BICEP_CURL_CONFIG.MAX_TORSO_SWING_DEG ||
      upperArmAngle > BICEP_CURL_CONFIG.MAX_UPPER_ARM_SWING_DEG
    ) {
      this.currentRepMistakes.add(BICEP_CURL_CONFIG.MESSAGES.SWINGING_BODY);
      this.latestMistake = BICEP_CURL_CONFIG.MESSAGES.SWINGING_BODY;
    }

    // State Machine
    switch (this.state) {
      case 'READY':
        // Check if user starts curling before fully extending from a previous rep
        if (
          this.repCount > 0 &&
          elbowAngle < BICEP_CURL_CONFIG.CURL_TRIGGER_ANGLE &&
          this.highestExtensionAngleInRep < BICEP_CURL_CONFIG.INCOMPLETE_EXTENSION_LIMIT
        ) {
          this.currentRepMistakes.add(BICEP_CURL_CONFIG.MESSAGES.NOT_FULLY_EXTENDING);
          this.latestMistake = BICEP_CURL_CONFIG.MESSAGES.NOT_FULLY_EXTENDING;
        }

        if (elbowAngle < BICEP_CURL_CONFIG.CURL_TRIGGER_ANGLE) {
          this.state = 'CURLING';
          this.curlStartTime = timestampMs;
          this.lowestElbowAngleInRep = elbowAngle;
          this.maxTorsoLeanInRep = torsoLean;
          this.maxUpperArmSwingInRep = upperArmAngle;
          this.currentRepMistakes.clear();
        } else {
          this.highestExtensionAngleInRep = Math.max(
            this.highestExtensionAngleInRep,
            elbowAngle
          );
        }
        break;

      case 'CURLING':
        this.lowestElbowAngleInRep = Math.min(this.lowestElbowAngleInRep, elbowAngle);
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);
        this.maxUpperArmSwingInRep = Math.max(this.maxUpperArmSwingInRep, upperArmAngle);

        if (elbowAngle <= BICEP_CURL_CONFIG.FULLY_CURLED_ANGLE_MAX) {
          this.state = 'TOP';
        } else if (elbowAngle > this.lowestElbowAngleInRep + 8) {
          // Started lowering early without curling high enough
          if (this.lowestElbowAngleInRep > BICEP_CURL_CONFIG.INCOMPLETE_CURL_LIMIT) {
            this.currentRepMistakes.add(
              BICEP_CURL_CONFIG.MESSAGES.NOT_CURLING_HIGH_ENOUGH
            );
            this.latestMistake =
              BICEP_CURL_CONFIG.MESSAGES.NOT_CURLING_HIGH_ENOUGH;
          }
          this.state = 'LOWERING';
        }
        break;

      case 'TOP':
        this.lowestElbowAngleInRep = Math.min(this.lowestElbowAngleInRep, elbowAngle);
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);
        this.maxUpperArmSwingInRep = Math.max(this.maxUpperArmSwingInRep, upperArmAngle);

        if (elbowAngle > this.lowestElbowAngleInRep + 8) {
          this.state = 'LOWERING';

          const curlDuration = timestampMs - this.curlStartTime;
          if (curlDuration < BICEP_CURL_CONFIG.MIN_CURL_DURATION_MS) {
            this.currentRepMistakes.add(BICEP_CURL_CONFIG.MESSAGES.TOO_FAST);
            this.latestMistake = BICEP_CURL_CONFIG.MESSAGES.TOO_FAST;
          }
        }
        break;

      case 'LOWERING':
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);
        this.maxUpperArmSwingInRep = Math.max(this.maxUpperArmSwingInRep, upperArmAngle);

        if (elbowAngle >= BICEP_CURL_CONFIG.EXTENDED_ARM_ANGLE_MIN) {
          this.state = 'READY';

          if (this.lowestElbowAngleInRep > BICEP_CURL_CONFIG.INCOMPLETE_CURL_LIMIT) {
            this.currentRepMistakes.add(
              BICEP_CURL_CONFIG.MESSAGES.NOT_CURLING_HIGH_ENOUGH
            );
            this.latestMistake =
              BICEP_CURL_CONFIG.MESSAGES.NOT_CURLING_HIGH_ENOUGH;
          }

          let repScore = 100;
          if (this.currentRepMistakes.has(BICEP_CURL_CONFIG.MESSAGES.SWINGING_BODY)) {
            repScore -= BICEP_CURL_CONFIG.DEDUCTIONS.SWINGING_BODY;
          }
          if (
            this.currentRepMistakes.has(
              BICEP_CURL_CONFIG.MESSAGES.NOT_CURLING_HIGH_ENOUGH
            )
          ) {
            repScore -= BICEP_CURL_CONFIG.DEDUCTIONS.NOT_CURLING_HIGH_ENOUGH;
          }
          if (
            this.currentRepMistakes.has(
              BICEP_CURL_CONFIG.MESSAGES.NOT_FULLY_EXTENDING
            )
          ) {
            repScore -= BICEP_CURL_CONFIG.DEDUCTIONS.NOT_FULLY_EXTENDING;
          }
          if (this.currentRepMistakes.has(BICEP_CURL_CONFIG.MESSAGES.TOO_FAST)) {
            repScore -= BICEP_CURL_CONFIG.DEDUCTIONS.TOO_FAST;
          }
          repScore = Math.max(40, repScore);

          this.repCount += 1;
          const curlDuration = timestampMs - this.curlStartTime;
          const mistakesArr = Array.from(this.currentRepMistakes);

          this.completedReps.push({
            repNumber: this.repCount,
            score: repScore,
            mistakes: mistakesArr,
            metrics: {
              lowestElbowAngle: Math.round(this.lowestElbowAngleInRep),
              maxTorsoLean: Math.round(this.maxTorsoLeanInRep),
              maxUpperArmSwing: Math.round(this.maxUpperArmSwingInRep),
            },
            durationMs: curlDuration,
          });

          this.highestExtensionAngleInRep = elbowAngle;

          if (mistakesArr.length === 0) {
            this.latestMistake = BICEP_CURL_CONFIG.MESSAGES.CLEAN_FORM;
            this.formStatus = 'good';
          } else if (repScore >= 75) {
            this.formStatus = 'warning';
          } else {
            this.formStatus = 'bad';
          }
        }
        break;
    }

    return this.buildResult(true, null, elbowAngle, torsoLean, arm);
  }

  private buildResult(
    isBodyInFrame: boolean,
    bodyInFrameMessage: string | null,
    elbowAngle: number,
    torsoLean: number,
    activeSide: 'left' | 'right'
  ): ExerciseAnalysisResult {
    const totalScore = this.getTotalScore();

    let dynamicFormStatus: FormStatus = 'good';
    if (!isBodyInFrame) {
      dynamicFormStatus = 'bad';
    } else if (
      this.state === 'CURLING' ||
      this.state === 'TOP' ||
      this.state === 'LOWERING'
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
        name: 'Elbow Curl',
        value: Math.round(elbowAngle),
        unit: '°',
        targetDesc: 'target: <50°',
        percent: Math.min(100, Math.max(0, Math.round(elbowAngle / 1.8))),
      },
      secondaryMetric: {
        name: 'Torso Swing',
        value: Math.round(torsoLean),
        unit: '°',
        limitDesc: 'limit: <15°',
        percent: Math.min(100, Math.round((torsoLean / 45) * 100)),
        isWarning: torsoLean > BICEP_CURL_CONFIG.MAX_TORSO_SWING_DEG,
      },
      activeSide,
      completedReps: this.completedReps,
      shouldAutoFinish: this.shouldAutoFinish,
    };
  }
}
