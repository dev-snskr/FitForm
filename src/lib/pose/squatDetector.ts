// FitForm Squat Detector & Real-Time Biomechanics Analyzer
// State machine for rep counting, mistake classification, and form scoring.

import {
  LandmarkPoint,
  POSE_LANDMARKS,
  calculateAngle,
  calculateTorsoLean,
  calculateKneeTravelPastToes,
} from './angleMath';
import { SQUAT_CONFIG } from './squatConfig';

export type SquatState = 'IDLE' | 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';
export type FormStatus = 'good' | 'warning' | 'bad';

export interface RepSummary {
  repNumber: number;
  score: number;
  mistakes: string[];
  lowestKneeAngle: number;
  maxTorsoLean: number;
  descentDurationMs: number;
}

export interface SquatAnalysisResult {
  state: SquatState;
  repCount: number;
  currentScore: number; // 0-100 (100 initially)
  latestMistake: string | null;
  formStatus: FormStatus;
  isBodyInFrame: boolean;
  bodyInFrameMessage: string | null;
  kneeAngle: number;
  torsoLean: number;
  activeSide: 'left' | 'right';
  completedReps: RepSummary[];
  shouldAutoFinish: boolean;
}

export class SquatDetector {
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

  /**
   * Processes a single landmark frame and returns updated analysis.
   */
  public processFrame(
    landmarks: LandmarkPoint[],
    timestampMs: number = Date.now()
  ): SquatAnalysisResult {
    if (!landmarks || landmarks.length < 33) {
      return this.buildResult(false, SQUAT_CONFIG.MESSAGES.OUT_OF_FRAME, 180, 0, 'left');
    }

    if (this.lastMovementTime === 0) {
      this.lastMovementTime = timestampMs;
    }

    // 1. Determine which side (left or right) is facing the camera with highest confidence
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

    // 2. Body-in-frame validation check
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

    // Key body points for active side
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

    // 3. Biomechanical Calculations
    // Knee Angle: Hip -> Knee -> Ankle (vertex at Knee)
    const kneeAngle = calculateAngle(hip, knee, ankle);

    // Torso Lean: Shoulder relative to Hip from vertical
    const torsoLean = calculateTorsoLean(shoulder, hip);

    // Check if user is actively moving
    const angleDelta = Math.abs(kneeAngle - this.previousKneeAngle);
    if (angleDelta > 2.0) {
      this.lastMovementTime = timestampMs;
    }
    this.previousKneeAngle = kneeAngle;

    // Check auto-finish inactivity (8s stationary with at least 1 completed rep)
    if (
      this.repCount >= 1 &&
      timestampMs - this.lastMovementTime >= SQUAT_CONFIG.AUTO_FINISH_INACTIVITY_MS
    ) {
      this.shouldAutoFinish = true;
    }

    // Check Knee vs Toe forward travel (only if toe confidence is high)
    const toeConfidence = toe.visibility || 0;
    if (toeConfidence >= SQUAT_CONFIG.MIN_FOOT_VISIBILITY_FOR_BALANCE) {
      // Determine facing direction: if ankle.x < toe.x, facing right
      const facingRight = ankle.x < toe.x;
      const kneePastToe = calculateKneeTravelPastToes(knee, toe, facingRight);
      if (kneePastToe > SQUAT_CONFIG.MAX_KNEE_PAST_TOE_RATIO) {
        this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.KNEES_PAST_TOES);
        this.latestMistake = SQUAT_CONFIG.MESSAGES.KNEES_PAST_TOES;
      }
    }

    // 4. Squat State Machine
    switch (this.state) {
      case 'STANDING':
        // Transition to DESCENDING when knee flexes below trigger angle
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

        // Check for torso lean during descent
        if (torsoLean > SQUAT_CONFIG.MAX_TORSO_FORWARD_LEAN_DEG) {
          this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.LEANING_FORWARD);
          this.latestMistake = SQUAT_CONFIG.MESSAGES.LEANING_FORWARD;
        }

        // Reached full bottom depth
        if (kneeAngle <= SQUAT_CONFIG.SQUAT_DEPTH_KNEE_ANGLE_MAX) {
          this.state = 'BOTTOM';
        }
        // Early inflection: user started coming up before reaching bottom!
        else if (
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

        // Begins rising from bottom
        if (kneeAngle > this.lowestKneeAngleInRep + 8) {
          this.state = 'ASCENDING';

          // Speed check on descent
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

        // Returned fully to standing position: REP COMPLETED
        if (kneeAngle >= SQUAT_CONFIG.STANDING_KNEE_ANGLE_MIN) {
          this.state = 'STANDING';

          // Check if bottom depth was missed (in case not already flagged)
          if (this.lowestKneeAngleInRep > SQUAT_CONFIG.SQUAT_DEPTH_KNEE_ANGLE_MAX) {
            this.currentRepMistakes.add(SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH);
            this.latestMistake = SQUAT_CONFIG.MESSAGES.NOT_DEEP_ENOUGH;
          }

          // Calculate rep score (starts at 100, deductions applied per unique mistake)
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
            lowestKneeAngle: Math.round(this.lowestKneeAngleInRep),
            maxTorsoLean: Math.round(this.maxTorsoLeanInRep),
            descentDurationMs: descentDuration,
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
  ): SquatAnalysisResult {
    const totalScore =
      this.completedReps.length > 0
        ? Math.round(
            this.completedReps.reduce((sum, r) => sum + r.score, 0) /
              this.completedReps.length
          )
        : 100;

    let dynamicFormStatus: FormStatus = 'good';
    if (!isBodyInFrame) {
      dynamicFormStatus = 'bad';
    } else if (this.state === 'DESCENDING' || this.state === 'BOTTOM' || this.state === 'ASCENDING') {
      if (this.currentRepMistakes.size > 0) {
        dynamicFormStatus = this.currentRepMistakes.size > 1 ? 'bad' : 'warning';
      }
    } else {
      dynamicFormStatus = this.formStatus;
    }

    return {
      state: this.state,
      repCount: this.repCount,
      currentScore: totalScore,
      latestMistake: this.latestMistake,
      formStatus: dynamicFormStatus,
      isBodyInFrame,
      bodyInFrameMessage,
      kneeAngle: Math.round(kneeAngle),
      torsoLean: Math.round(torsoLean),
      activeSide,
      completedReps: this.completedReps,
      shouldAutoFinish: this.shouldAutoFinish,
    };
  }
}
