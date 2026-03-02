import { AuthToken } from '@/types';

const AUTH_KEY = 'heatzy_auth';
const DEVICE_NAMES_KEY = 'heatzy_device_names';

export function storeToken(auth: AuthToken): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function getStoredToken(): AuthToken | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthToken;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_KEY);
}

// Token expires in 7 days. We treat it as expired 1 hour early.
export function isTokenValid(auth: AuthToken): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return auth.expire_at > nowSeconds + 3600;
}

export function isTokenExpiringSoon(auth: AuthToken): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const hoursRemaining = (auth.expire_at - nowSeconds) / 3600;
  return hoursRemaining > 0 && hoursRemaining < 24;
}

export function getValidToken(): AuthToken | null {
  const auth = getStoredToken();
  if (!auth || !isTokenValid(auth)) return null;
  return auth;
}

// Device name overrides (stored locally since GizWits rename may not always work)
export function getDeviceNameOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DEVICE_NAMES_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function setDeviceNameOverride(did: string, name: string): void {
  const existing = getDeviceNameOverrides();
  localStorage.setItem(DEVICE_NAMES_KEY, JSON.stringify({ ...existing, [did]: name }));
}

export function getDeviceNameOverride(did: string): string | undefined {
  return getDeviceNameOverrides()[did];
}
