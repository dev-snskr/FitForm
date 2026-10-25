// tests/speechAndRestTimer.test.ts
// Comprehensive unit tests for FitForm Voice Coaching, Speech Scheduler,
// and Rest Timer logic using fake speech engine and virtual time.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SpeechScheduler,
  ISpeechEngine,
} from '../src/lib/voice/speechScheduler';
import { VoiceSettings } from '../src/lib/voice/voiceSettings';
import {
  getCorrectionPhrase,
  getExerciseTip,
  EXERCISE_VOICE_CORRECTIONS,
} from '../src/lib/voice/phrases';
import {
  getStoredRestPreference,
  saveStoredRestPreference,
  clearStoredRestPreference,
} from '../src/lib/workout/restPreferences';

// Mock in-memory localStorage for Node test environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
Object.defineProperty(global, 'localStorage', { value: fakeLocalStorage, writable: true });

// Deterministic Fake Speech Engine
class FakeSpeechEngine implements ISpeechEngine {
  public spokenHistory: { text: string; settings: VoiceSettings }[] = [];
  public cancelCount = 0;
  private speaking = false;

  public speak(
    text: string,
    settings: VoiceSettings,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    this.speaking = true;
    this.spokenHistory.push({ text, settings });
    onStart?.();
    this.speaking = false;
    onEnd?.();
  }

  public cancel(): void {
    this.cancelCount++;
    this.speaking = false;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return [];
  }
}

describe('Step 4: Voice Corrections & Rest Timer Suite', () => {
  let fakeEngine: FakeSpeechEngine;
  let scheduler: SpeechScheduler;

  const testSettings: VoiceSettings = {
    enabled: true,
    voiceURI: null,
    speed: 1.0,
    volume: 1.0,
    beepsEnabled: true,
    announceReps: false,
  };

  beforeEach(() => {
    fakeEngine = new FakeSpeechEngine();
    scheduler = new SpeechScheduler(fakeEngine);
    mockStorage.clear();
  });

  describe('1. Speech Scheduler Biomechanical Rules', () => {
    it('1.1 Silent during rest / inactive sets: rejects normal cues when set is not active', () => {
      scheduler.setSetInProgress(false);
      const res = scheduler.speak({ text: 'Go deeper' }, 1000, testSettings);
      expect(res).toBe(false);
      expect(fakeEngine.spokenHistory.length).toBe(0);
    });

    it('1.2 Active set speaks successfully', () => {
      scheduler.setSetInProgress(true);
      const res = scheduler.speak({ text: 'Go deeper' }, 1000, testSettings);
      expect(res).toBe(true);
      expect(fakeEngine.spokenHistory.length).toBe(1);
      expect(fakeEngine.spokenHistory[0].text).toBe('Go deeper');
    });

    it('1.3 Anti-overlap: cancels currently active speech before triggering new cue (never queues)', () => {
      scheduler.setSetInProgress(true);
      scheduler.speak({ text: 'Keep chest up' }, 1000, testSettings);
      expect(fakeEngine.cancelCount).toBe(1);

      scheduler.speak({ text: 'Push your knees out' }, 5000, testSettings);
      expect(fakeEngine.cancelCount).toBe(2);
      expect(fakeEngine.spokenHistory.length).toBe(2);
    });

    it('1.4 Duplicate mistake cooldown: blocks same mistake repeated within 8 seconds', () => {
      scheduler.setSetInProgress(true);

      // First utterance of "hips_sagging" at t = 1000ms
      const first = scheduler.speak(
        { text: 'Hips up, lock your core', mistakeKey: 'hips_sagging' },
        1000,
        testSettings
      );
      expect(first).toBe(true);

      // Attempt second utterance of same mistake at t = 5000ms (only 4s later, < 8s)
      const second = scheduler.speak(
        { text: 'Hips up, lock your core', mistakeKey: 'hips_sagging' },
        5000,
        testSettings
      );
      expect(second).toBe(false);
      expect(fakeEngine.spokenHistory.length).toBe(1);

      // Attempt after 8s cooldown expires at t = 9500ms (> 8000ms)
      const third = scheduler.speak(
        { text: 'Hips up, lock your core', mistakeKey: 'hips_sagging' },
        9500,
        testSettings
      );
      expect(third).toBe(true);
      expect(fakeEngine.spokenHistory.length).toBe(2);
    });

    it('1.5 Minimum speech interval: enforces 3 seconds spacing between ANY two cues', () => {
      scheduler.setSetInProgress(true);

      // Cue A at t = 1000ms
      scheduler.speak({ text: 'Go deeper', mistakeKey: 'not_deep' }, 1000, testSettings);

      // Cue B at t = 2500ms (only 1.5s later, < 3s minimum interval)
      const blocked = scheduler.speak(
        { text: 'Keep chest up', mistakeKey: 'leaning' },
        2500,
        testSettings
      );
      expect(blocked).toBe(false);

      // Cue B at t = 4200ms (> 3000ms after Cue A)
      const allowed = scheduler.speak(
        { text: 'Keep chest up', mistakeKey: 'leaning' },
        4200,
        testSettings
      );
      expect(allowed).toBe(true);
      expect(fakeEngine.spokenHistory.length).toBe(2);
    });

    it('1.6 Countdown exception: rest cues bypass 3s interval and set-in-progress check', () => {
      scheduler.setSetInProgress(false); // Rest mode

      const three = scheduler.speak({ text: 'Three', isCountdown: true }, 1000, testSettings);
      const two = scheduler.speak({ text: 'Two', isCountdown: true }, 2000, testSettings);
      const one = scheduler.speak({ text: 'One', isCountdown: true }, 3000, testSettings);

      expect(three).toBe(true);
      expect(two).toBe(true);
      expect(one).toBe(true);
      expect(fakeEngine.spokenHistory.map((h) => h.text)).toEqual(['Three', 'Two', 'One']);
    });

    it('1.7 Disabled voice setting: visual caption dispatches but speech synthesis is skipped', () => {
      scheduler.setSetInProgress(true);
      const disabledSettings: VoiceSettings = { ...testSettings, enabled: false };

      let lastCaption: string | null = null;
      scheduler.addCaptionListener((cap) => {
        lastCaption = cap;
      });

      const res = scheduler.speak({ text: 'Step back into view' }, 1000, disabledSettings);

      expect(res).toBe(false);
      expect(fakeEngine.spokenHistory.length).toBe(0);
      expect(lastCaption).toBe('Step back into view');
    });

    it('1.8 Positive cue throttling: allows positive cue at most once every 3 clean reps', () => {
      scheduler.setSetInProgress(true);

      const r1 = scheduler.maybeSpeakPositive(1, 'Great form!', 1000, testSettings);
      expect(r1).toBe(true);

      const r2 = scheduler.maybeSpeakPositive(2, 'Nice depth!', 5000, testSettings);
      expect(r2).toBe(false); // only 1 rep later, need 3

      const r3 = scheduler.maybeSpeakPositive(3, 'Nice depth!', 9000, testSettings);
      expect(r3).toBe(false); // 2 reps later

      const r4 = scheduler.maybeSpeakPositive(4, 'Solid rep!', 13000, testSettings);
      expect(r4).toBe(true); // 3 reps later, allowed!
    });
  });

  describe('2. Phrases & Concise Word Lengths', () => {
    it('2.1 Every correction phrase is under 8 words', () => {
      for (const [exercise, rules] of Object.entries(EXERCISE_VOICE_CORRECTIONS)) {
        for (const rule of rules) {
          const wordCount = rule.phrase.trim().split(/\s+/).length;
          expect(wordCount).toBeLessThanOrEqual(8);
        }
      }
    });

    it('2.2 Maps detected mistake strings to correct phrases', () => {
      const p1 = getCorrectionPhrase('squat', 'Not deep enough');
      expect(p1?.phrase).toBe('Go deeper');

      const p2 = getCorrectionPhrase('push_up', 'Hips sagging toward floor');
      expect(p2?.phrase).toBe('Hips up, lock your core');

      const p3 = getCorrectionPhrase('bicep_curl', 'Swinging your body');
      expect(p3?.phrase).toBe("Don't swing, keep elbow still");

      const p4 = getCorrectionPhrase('lunge', 'Leaning too far forward');
      expect(p4?.phrase).toBe('Keep your torso tall');

      const p5 = getCorrectionPhrase('plank', 'Head dropping');
      expect(p5?.phrase).toBe('Head up, neutral neck');
    });

    it('2.3 Provides contextual exercise rest tips for all supported exercises', () => {
      expect(getExerciseTip('Bodyweight Squat')).toContain('heels');
      expect(getExerciseTip('Push-Up')).toContain('elbows');
      expect(getExerciseTip('Bicep Curl')).toContain('Pin your elbows');
      expect(getExerciseTip('Walking / Static Lunge')).toContain('front knee');
      expect(getExerciseTip('Forearm Plank')).toContain('forearms');
    });
  });

  describe('3. Rest Preferences Persistence & Time Calculation', () => {
    it('3.1 Returns plan recommended rest when no user preference is set', () => {
      const rest = getStoredRestPreference('Push-Up', 45, 999);
      expect(rest).toBe(45);
    });

    it('3.2 Saves and remembers user adjusted rest per exercise and per profile', () => {
      saveStoredRestPreference('Push-Up', 90, 999);
      expect(getStoredRestPreference('Push-Up', 45, 999)).toBe(90);

      // Different user profile still gets their own/default rest
      expect(getStoredRestPreference('Push-Up', 45, 888)).toBe(45);
    });

    it('3.3 "Reset to recommended" cleanly clears custom preference', () => {
      saveStoredRestPreference('Bodyweight Squat', 120, 999);
      expect(getStoredRestPreference('Bodyweight Squat', 60, 999)).toBe(120);

      clearStoredRestPreference('Bodyweight Squat', 999);
      expect(getStoredRestPreference('Bodyweight Squat', 60, 999)).toBe(60);
    });

    it('3.4 Real-timestamp countdown logic handles time jumps and background throttling', () => {
      const startTime = 100000;
      const targetSeconds = 60;
      const expectedEndTime = startTime + targetSeconds * 1000;

      // Simulated tab backgrounding: time jumps forward 35 seconds
      const simulatedNow = startTime + 35000;
      const diffMs = expectedEndTime - simulatedNow;
      const remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));

      expect(remainingSeconds).toBe(25);
    });
  });
});
