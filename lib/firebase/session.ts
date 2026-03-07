const SESSION_EXPIRY_KEY = "sw_session_expiry_time";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getSessionExpiryTime(): number | null {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(SESSION_EXPIRY_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setSessionExpiry(durationMs = SESSION_DURATION_MS): number {
  const expiresAt = Date.now() + durationMs;
  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
  }
  return expiresAt;
}

export function clearSessionExpiry(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_EXPIRY_KEY);
}

export function isSessionExpired(now = Date.now()): boolean {
  const expiresAt = getSessionExpiryTime();
  if (!expiresAt) return true;
  return now >= expiresAt;
}

export function getSessionRemainingMs(now = Date.now()): number {
  const expiresAt = getSessionExpiryTime();
  if (!expiresAt) return 0;
  return Math.max(expiresAt - now, 0);
}

export function getSessionExpiryKey(): string {
  return SESSION_EXPIRY_KEY;
}
