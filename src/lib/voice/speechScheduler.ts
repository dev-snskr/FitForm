// src/lib/voice/speechScheduler.ts
// FitForm Speech Scheduler & Browser SpeechSynthesis Controller
// Enforces cooldowns, mistake priority ordering, anti-overlap cancellation, and on-screen caption dispatch.

import { VoiceSettings, getStoredVoiceSettings, selectBestEnglishVoice } from './voiceSettings';

export interface ISpeechEngine {
  speak(text: string, settings: VoiceSettings, onStart?: () => void, onEnd?: () => void): void;
  cancel(): void;
  isSpeaking(): boolean;
  getVoices(): SpeechSynthesisVoice[];
  onVoicesChanged?(callback: () => void): void;
}

// Browser Implementation of ISpeechEngine
export class BrowserSpeechEngine implements ISpeechEngine {
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  public speak(
    text: string,
    settings: VoiceSettings,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance; // Retain reference to prevent Chrome GC bug

      const voices = window.speechSynthesis.getVoices();
      const chosenVoice = selectBestEnglishVoice(voices, settings.voiceURI);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.rate = settings.speed;
      utterance.volume = settings.volume;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        onStart?.();
      };

      const handleDone = () => {
        this.activeUtterance = null;
        onEnd?.();
      };

      utterance.onend = handleDone;
      utterance.onerror = handleDone;

      window.speechSynthesis.speak(utterance);
    } catch {
      onEnd?.();
    }
  }

  public cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  public onVoicesChanged(callback: () => void): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = callback;
    }
  }
}

export interface SpeechRequest {
  text: string;
  mistakeKey?: string;
  priority?: number; // default 50
  isCountdown?: boolean; // Rest cues ignore set-in-progress state
  isPositive?: boolean;
}

export type CaptionListener = (caption: string | null) => void;

export class SpeechScheduler {
  private engine: ISpeechEngine;
  private isSetInProgress = false;
  private lastSpokenTimestamp = 0;
  private lastMistakeTimestamps = new Map<string, number>();
  private captionListeners = new Set<CaptionListener>();
  private captionTimeout: NodeJS.Timeout | null = null;
  private lastCleanRepSpoken = -3;

  // Rules timing constants (in ms)
  public static readonly MIN_INTERVAL_BETWEEN_SPEECH_MS = 3000;
  public static readonly DUPLICATE_MISTAKE_COOLDOWN_MS = 8000;
  public static readonly POSITIVE_CUE_COOLDOWN_REPS = 3;

  constructor(engine?: ISpeechEngine) {
    this.engine = engine || new BrowserSpeechEngine();
  }

  public setSetInProgress(active: boolean): void {
    this.isSetInProgress = active;
    if (!active) {
      // Clear current mistake tracking when set finishes
      this.lastMistakeTimestamps.clear();
      this.clearCaption();
    }
  }

  public getIsSetInProgress(): boolean {
    return this.isSetInProgress;
  }

  public addCaptionListener(listener: CaptionListener): () => void {
    this.captionListeners.add(listener);
    return () => {
      this.captionListeners.delete(listener);
    };
  }

  private dispatchCaption(text: string, durationMs = 3200): void {
    if (this.captionTimeout) clearTimeout(this.captionTimeout);
    this.captionListeners.forEach((fn) => fn(text));

    this.captionTimeout = setTimeout(() => {
      this.clearCaption();
    }, durationMs);
  }

  public clearCaption(): void {
    if (this.captionTimeout) clearTimeout(this.captionTimeout);
    this.captionTimeout = null;
    this.captionListeners.forEach((fn) => fn(null));
  }

  /**
   * Main entry point to request speech.
   * Enforces priority, duplicate avoidance, spacing, and settings.
   */
  public speak(
    request: SpeechRequest,
    currentTimestampMs: number = Date.now(),
    customSettings?: VoiceSettings
  ): boolean {
    const settings = customSettings || getStoredVoiceSettings();
    const text = request.text.trim();
    if (!text) return false;

    // Countdown cues (for rest timer) are allowed even when set is not active
    if (!request.isCountdown && !this.isSetInProgress) {
      return false;
    }

    // Always display visual caption even if speech is muted (for accessibility)
    this.dispatchCaption(text);

    // If voice coaching is completely disabled in settings, return after visual caption
    if (!settings.enabled) {
      return false;
    }

    // 1. Spacing check: do not speak if another cue was spoken within 3 seconds
    const elapsedSinceLastSpeech = currentTimestampMs - this.lastSpokenTimestamp;
    if (
      this.lastSpokenTimestamp > 0 &&
      elapsedSinceLastSpeech < SpeechScheduler.MIN_INTERVAL_BETWEEN_SPEECH_MS
    ) {
      // Exception: countdown cues "3, 2, 1" (spaced by 1s)
      if (!request.isCountdown) {
        return false;
      }
    }

    // 2. Duplicate mistake cooldown check: do not repeat the same mistake within 8 seconds
    if (request.mistakeKey) {
      const lastTimeKeySpoken = this.lastMistakeTimestamps.get(request.mistakeKey) || 0;
      if (
        lastTimeKeySpoken > 0 &&
        currentTimestampMs - lastTimeKeySpoken < SpeechScheduler.DUPLICATE_MISTAKE_COOLDOWN_MS
      ) {
        return false;
      }
    }

    // 3. Cancel any currently speaking utterance (never queue or talk over itself)
    this.engine.cancel();

    // 4. Update timestamps
    this.lastSpokenTimestamp = currentTimestampMs;
    if (request.mistakeKey) {
      this.lastMistakeTimestamps.set(request.mistakeKey, currentTimestampMs);
    }

    // 5. Send to speech engine
    this.engine.speak(text, settings);
    return true;
  }

  /**
   * Evaluates if a positive reinforcement phrase should be spoken on a clean rep.
   */
  public maybeSpeakPositive(
    repCount: number,
    phrase: string,
    currentTimestampMs: number = Date.now(),
    customSettings?: VoiceSettings
  ): boolean {
    if (repCount - this.lastCleanRepSpoken < SpeechScheduler.POSITIVE_CUE_COOLDOWN_REPS) {
      return false;
    }
    this.lastCleanRepSpoken = repCount;
    return this.speak(
      { text: phrase, priority: 20, isPositive: true },
      currentTimestampMs,
      customSettings
    );
  }

  public cancel(): void {
    this.engine.cancel();
    this.clearCaption();
  }

  public reset(): void {
    this.cancel();
    this.lastSpokenTimestamp = 0;
    this.lastMistakeTimestamps.clear();
    this.lastCleanRepSpoken = -SpeechScheduler.POSITIVE_CUE_COOLDOWN_REPS;
  }
}

// Global shared instance for the application
export const globalSpeechScheduler = new SpeechScheduler();
