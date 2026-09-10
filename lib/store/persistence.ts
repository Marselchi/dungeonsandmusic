export const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:21000";

const STORAGE_KEYS = {
  backendUrl: "discord-music-bot:backendUrl",
  token: "discord-music-bot:token",
} as const;

/**
 * Backend URL + pairing token are per-visitor runtime settings, not
 * build-time config: this app is one static bundle deployed once to
 * Vercel, and every visitor points it at *their own* backend (their own
 * machine, or their own tunnel URL). Baking a single backend URL in at
 * build time would only ever work for one person. Persisted in
 * localStorage so returning visitors don't have to re-enter it.
 */
export function loadPersistedBackendUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BACKEND_URL;
  return window.localStorage.getItem(STORAGE_KEYS.backendUrl) ?? DEFAULT_BACKEND_URL;
}

export function persistBackendUrl(url: string): void {
  window.localStorage.setItem(STORAGE_KEYS.backendUrl, url);
}

export function loadPersistedToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEYS.token);
}

export function persistToken(token: string | null): void {
  if (token === null) window.localStorage.removeItem(STORAGE_KEYS.token);
  else window.localStorage.setItem(STORAGE_KEYS.token, token);
}
