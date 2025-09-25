const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'auth_user_id';

export function setAuth(token: string | null | undefined, userId: string | null | undefined) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (userId) localStorage.setItem(USER_ID_KEY, userId);
}

export function clearAuth() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  try { localStorage.removeItem(USER_ID_KEY); } catch {}
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getUserId(): string | null {
  try { return localStorage.getItem(USER_ID_KEY); } catch { return null; }
}

export const AUTH_STORAGE_KEYS = {
  token: TOKEN_KEY,
  userId: USER_ID_KEY,
} as const;
