// src/lib/voice/soundEffects.ts
// FitForm Audio Synthesizer & Haptics Engine
// Generates soft melodic beeps directly in the browser via Web Audio API (zero audio files needed).
// Includes phone vibration trigger where supported by the device.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a clean, soft sine wave tone with exponential gain decay.
 */
export function playSynthesizedTone(
  frequency = 750,
  durationMs = 120,
  volume = 0.25
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Soft attack & exponential decay
    const now = ctx.currentTime;
    const durSec = durationMs / 1000;
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durSec);
  } catch {
    // Audio playback blocked or unsupported in this environment
  }
}

/**
 * Triggers device haptic vibration on mobile devices where supported.
 */
export function triggerHaptic(pattern: number | number[] = 150): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics not allowed or unsupported
    }
  }
}

/**
 * Sound cues for countdown milestones:
 */
export const CountdownSounds = {
  // Soft double-chime at 10 seconds remaining
  tenSecondsRemaining(volume = 0.25): void {
    playSynthesizedTone(660, 140, volume);
    triggerHaptic(100);
  },

  // Alert tone for 3 and 2
  threeOrTwo(volume = 0.25): void {
    playSynthesizedTone(750, 110, volume);
    triggerHaptic(120);
  },

  // High, celebratory ready tone for 1 / GO
  oneOrGo(volume = 0.3): void {
    playSynthesizedTone(980, 200, volume);
    triggerHaptic([100, 50, 150]);
  },
};
