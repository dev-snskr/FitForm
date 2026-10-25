// FitForm Profile & Session Storage Helper
// Manages active user identity in the browser (localStorage) to remember returning users.

export const ACTIVE_USER_KEY = 'fitform_active_user_id';

export function getStoredActiveUserId(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ACTIVE_USER_KEY);
  if (!stored) return null;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? null : parsed;
}

export function setStoredActiveUserId(id: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_USER_KEY, id.toString());
}

export function removeStoredActiveUserId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_KEY);
}
