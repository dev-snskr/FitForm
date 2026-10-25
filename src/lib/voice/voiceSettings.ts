// src/lib/voice/voiceSettings.ts
// FitForm Voice and Sound Preferences Management
// Persists settings per active profile into localStorage and selects the best natural browser voice.

import { getStoredActiveUserId } from '../profileStorage';

export interface VoiceSettings {
  enabled: boolean;
  voiceURI: string | null;
  speed: number; // 0.8 to 1.3, default 1.0
  volume: number; // 0.0 to 1.0, default 1.0
  beepsEnabled: boolean;
  announceReps: boolean; // default false
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  voiceURI: null,
  speed: 1.0,
  volume: 1.0,
  beepsEnabled: true,
  announceReps: false,
};

function getStorageKey(userId?: number | null): string {
  const uid = userId ?? getStoredActiveUserId();
  return uid ? `fitform_voice_settings_${uid}` : 'fitform_voice_settings_default';
}

/**
 * Loads voice settings for the given user, falling back to sensible defaults.
 */
export function getStoredVoiceSettings(userId?: number | null): VoiceSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_VOICE_SETTINGS };

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      voiceURI: parsed.voiceURI || null,
      speed: typeof parsed.speed === 'number' ? Math.max(0.7, Math.min(1.4, parsed.speed)) : 1.0,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 1.0,
      beepsEnabled: typeof parsed.beepsEnabled === 'boolean' ? parsed.beepsEnabled : true,
      announceReps: typeof parsed.announceReps === 'boolean' ? parsed.announceReps : false,
    };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

/**
 * Saves voice settings for the given user.
 */
export function saveStoredVoiceSettings(settings: VoiceSettings, userId?: number | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
    // Dispatch custom event if in browser
    if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
      window.dispatchEvent(new CustomEvent('fitform_voice_settings_changed', { detail: settings }));
    }
  } catch {
    // LocalStorage quota or access error
  }
}

/**
 * Finds the most natural English voice from the browser's speechSynthesis voice list.
 */
export function selectBestEnglishVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI?: string | null
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Explicit user selection
  if (preferredURI) {
    const matched = voices.find((v) => v.voiceURI === preferredURI);
    if (matched) return matched;
  }

  // 2. English voices sorted by quality keywords
  const englishVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('en-')
  );

  if (englishVoices.length === 0) {
    return voices[0] || null;
  }

  // Prefer natural / premium browser voices
  const highQualityKeywords = ['natural', 'google', 'siri', 'samantha', 'karen', 'daniel', 'oliver', 'serena'];
  const prioritized = englishVoices.find((v) =>
    highQualityKeywords.some((kw) => v.name.toLowerCase().includes(kw))
  );

  return prioritized || englishVoices[0];
}
