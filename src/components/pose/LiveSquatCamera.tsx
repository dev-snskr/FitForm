'use client';

// src/components/pose/LiveSquatCamera.tsx
// Backwards compatibility wrapper for LiveExerciseCamera with 'Bodyweight Squat'

import React from 'react';
import LiveExerciseCamera from './LiveExerciseCamera';

interface LiveSquatCameraProps {
  onSetCompleted: (result: {
    reps: number;
    formScore: number;
    mistakes: string[];
  }) => void;
  onCancel: () => void;
  targetReps: number;
  setNumber: number;
}

export default function LiveSquatCamera({
  onSetCompleted,
  onCancel,
  targetReps,
  setNumber,
}: LiveSquatCameraProps) {
  return (
    <LiveExerciseCamera
      exerciseName="Bodyweight Squat"
      onSetCompleted={onSetCompleted}
      onCancel={onCancel}
      targetReps={targetReps}
      setNumber={setNumber}
    />
  );
}
