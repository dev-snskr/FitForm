// src/lib/pose/analyzers/squatAnalyzer.ts
// FitForm Squat Biomechanical Analyzer
// Evaluates knee depth, torso forward lean, descent tempo, and knee/toe balance.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculateAngle,
  calculateTorsoLean,
  calculateKneeTravelPastToes,
} from '../angleMath';
import { SQUAT_CONFIG } from '../exerciseConfig';
import {
  IExerciseAnalyzer,
  ExerciseId,
  FormStatus,
  RepSummary,
  ExerciseAnalysisResult,
} from '../types';

export type SquatState = 'IDLE' | 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export class SquatAnalyzer implements IExerciseAnalyzer {
  public readonly exerciseId: ExerciseId = 'squat';
  public readonly exerciseName = 'Bodyweight Squat';
  public readonly setupInstructions =
    'Stand side-on to the camera, 2 to 3 metres away, full body visible in good lighting.';
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

  private state: SquatState = 'STANDING';
  private repCount = 0;
  private completedReps: RepSummary[] = [];

  // Active rep tracking
  private descentStartTime = 0;
  private lowestKneeAngleInRep = 180;
  private maxTorsoLeanInRep = 0;
  private currentRepMistakes = new Set<string>();

  // Overall metrics
  private latestMistake: string | null = null;
  private formStatus: FormStatus = 'good';
  private lastMovementTime = 0;
  private shouldAutoFinish = false;
  private previousKneeAngle = 180;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.state = 'STANDING';
    this.repCount = 0;
    this.completedReps = [];
    this.descentStartTime = 0;
    this.lowestKneeAngleInRep = 180;
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
  ): ExerciseAnalysisResult & { kneeAngle: number; torsoLean: number } {
    if (!landmarks || landmarks.length < 33) {
      return this.buildResult(false, SQUAT_CONFIG.MESSAGES.OUT_OF_FRAME, 180, 0, 'left');
    }

    if (this.lastMovementTime === 0) {
      this.lastMovementTime = timestampMs;
    }

    // Determine active side based on landmark visibility
    const leftConfidence =
      ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility || 0) +
        (landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility || 0)) /
      4;

    const rightConfidence =
      ((landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility || 0) +
        (landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility || 0)) /
      4;

    const activeSide: 'left' | 'right' =
      rightConfidence > leftConfidence ? 'right' : 'left';
    const activeConfidence =
      activeSide === 'right' ? rightConfidence : leftConfidence;

    // Body in frame check
    const isBodyInFrame = activeConfidence >= SQUAT_CONFIG.MIN_KEYPOINT_VISIBILITY;
    if (!isBodyInFrame) {
      this.formStatus = 'bad';
      return this.buildResult(
        false,
        SQUAT_CONFIG.MESSAGES.OUT_OF_FRAME,
        this.previousKneeAngle,
        0,
        activeSide
      );
    }

    // Key body points
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
    const knee =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_KNEE
          : POSE_LANDMARKS.LEFT_KNEE
      ];
    const ankle =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_ANKLE
          : POSE_LANDMARKS.LEFT_ANKLE
      ];
    const toe =
      landmarks[
        activeSide === 'right'
          ? POSE_LANDMARKS.RIGHT_FOOT_INDEX
          : POSE_LANDMARKS.LEFT_FOOT_INDEX
      ];

    // Joint angles
    const kneeAngle = calculateAngle(hip, knee, ankle);
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
      timestampMs - this.lastMovementTime >= SQUAT_CONFIG.AUTO_FINISH_INACTIVITY_MS
    ) {
      this.shouldAutoFinish = true;
    }

    // Knee past toes check
    const toeConfidence = toe.visibility || 0;
    if (toeConfidence >= SQUAT_CONFIG.MIN_FOOT_VISIBILITY_FOR_BALANCE) {
      const facingRight = ankle.x < toe.x;
      const kneePastToe = calculateKneeTravelPastToes(knee, toe, facingRight);
      if (kneePastToe > SQUAT_CONFIG.MAX_KNEE_PAST_TOE_RATIO) {
        this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.KNEES_PAST_TOES);
        this.latestMistake = SQUAT_CONFIG.MESSAGES.KNEES_PAST_TOES;
      }
    }

    // State machine
    switch (this.state) {
      case 'STANDING':
        if (kneeAngle < SQUAT_CONFIG.DESCENDING_TRIGGER_ANGLE) {
          this.state = 'DESCENDING';
          this.descentStartTime = timestampMs;
          this.lowestKneeAngleInRep = kneeAngle;
          this.maxTorsoLeanInRep = torsoLean;
          this.currentRepMistakes.clear();
        }
        break;

      case 'DESCENDING':
        this.lowestKneeAngleInRep = Math.min(this.lowestKneeAngleInRep, kneeAngle);
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > SQUAT_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = SQUAT_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle <= SQUAT_CONFIG.SQUAT_DEPTH_KNEE_ANGLE_MAX) {
          this.state = 'BOTTOM';
        } else if (
          kneeAngle > this.lowestKneeAngleInRep + 10 &&
          this.lowestKneeAngleInRep < SQUAT_CONFIG.SHALLOW_SQUAT_DEPTH_LIMIT
        ) {
          this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH);
          this.latestMistake = SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH;
          this.state = 'ASCENDING';
        }
        break;

      case 'BOTTOM':
        this.lowestKneeAngleInRep = Math.min(this.lowestKneeAngleInRep, kneeAngle);
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > SQUAT_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = SQUAT_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle > this.lowestKneeAngleInRep + 8) {
          this.state = 'ASCENDING';

          const descentDuration = timestampMs - this.descentStartTime;
          if (descentDuration < SQUAT_CONFIG.MIN_DESCENT_DURATION_MS) {
            this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.TOO_FAST);
            this.latestMistake = SQUAT_CONFIG.MESSAGES.TOO_FAST;
          }
        }
        break;

      case 'ASCENDING':
        this.maxTorsoLeanInRep = Math.max(this.maxTorsoLeanInRep, torsoLean);

        if (torsoLean > SQUAT_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = SQUAT_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        if (kneeAngle >= SQUAT_CONFIG.STANDING_KNEE_ANGLE_MIN) {
          this.state = 'STANDING';

          if (this.lowestKneeAngleInRep > SQUAT_CONFIG.SQUAT_DEPTH_KNEE_ANGLE_MAX) {
            this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH);
            this.latestMistake = SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH;
          }

          let repScore = 100;
          if (this.currentRepMistakes.has(SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH)) {
            repScore -= SQUAT_CONFIG.DEDUCTIONS.NOT_DEEP_ENOUGH;
          }
          if (this.currentRepMistakes.has(SQUAT_CONFIG.MESSAGES.LEANING_FORWARD)) {
            repScore -= SQUAT_CONFIG.DEDUCTIONS.LEANING_TOO_FAR_FORWARD;
          }
          if (this.currentRepMistakes.has(SQUAT_CONFIG.MESSAGES.TOO_FAST)) {
            repScore -= SQUAT_CONFIG.DEDUCTIONS.TOO_FAST;
          }
          if (this.currentRepMistakes.has(SQUAT_CONFIG.MESSAGES.KNEES_PAST_TOES)) {
            repScore -= SQUAT_CONFIG.DEDUCTIONS.KNEES_PAST_TOES;
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
              lowestKneeAngle: Math.round(this.lowestKneeAngleInRep),
              maxTorsoLean: Math.round(this.maxTorsoLeanInRep),
            },
            durationMs: descentDuration,
          });

          if (mistakesArr.length === 0) {
            this.latestMistake = SQUAT_CONFIG.MESSAGES.CLEAN_FORM;
            this.formStatus = 'good';
          } else if (repScore >= 75) {
            this.formStatus = 'warning';
          } else {
            this.formStatus = 'bad';
          }
        }
        break;
    }

    return this.buildResult(true, null, kneeAngle, torsoLean, activeSide);
  }

  private buildResult(
    isBodyInFrame: boolean,
    bodyInFrameMessage: string | null,
    kneeAngle: number,
    torsoLean: number,
    activeSide: 'left' | 'right'
  ): ExerciseAnalysisResult & { kneeAngle: number; torsoLean: number } {
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
        name: 'Knee Depth',
        value: Math.round(kneeAngle),
        unit: '°',
        targetDesc: 'target: <100°',
        percent: Math.min(100, Math.max(0, Math.round(kneeAngle / 1.8))),
      },
      secondaryMetric: {
        name: 'Torso Lean',
        value: Math.round(torsoLean),
        unit: '°',
        limitDesc: 'limit: 45°',
        percent: Math.min(100, Math.round((torsoLean / 60) * 100)),
        isWarning: torsoLean > SQUAT_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG,
      },
      activeSide,
      completedReps: this.completedReps,
      shouldAutoFinish: this.shouldAutoFinish,
      // Backwards compatibility properties
      kneeAngle: Math.round(kneeAngle),
      torsoLean: Math.round(torsoLean),
    };
  }
}
