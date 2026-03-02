'use client';

import { getStoredToken } from '@/lib/auth';
import {
  AuthToken,
  GizwitsBindingsResponse,
  GizwitsDeviceStatusResponse,
} from '@/types';

// GizWits platform constants (public values, documented in Heatzy OpenAPI)
const GIZWITS_BASE_URL = 'https://euapi.gizwits.com';
const GIZWITS_APP_ID = 'c70a66ff039d41b4a220e198b0fcc8b3';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function gizwitsHeaders(userToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Gizwits-Application-Id': GIZWITS_APP_ID,
  };
  if (userToken) headers['X-Gizwits-User-token'] = userToken;
  return headers;
}

async function gizwitsFetch<T>(
  path: string,
  options: RequestInit = {},
  userToken?: string
): Promise<T> {
  const res = await fetch(`${GIZWITS_BASE_URL}${path}`, {
    ...options,
    headers: gizwitsHeaders(userToken),
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      window.location.href = `${base}/login`;
    }
    throw new ApiError(401, 'Session expirée');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `Erreur ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

function getToken(): string | undefined {
  return getStoredToken()?.token;
}

export const api = {
  login: (username: string, password: string) =>
    gizwitsFetch<AuthToken>('/app/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, lang: 'en' }),
    }),

  getDevices: () =>
    gizwitsFetch<GizwitsBindingsResponse>(
      '/app/bindings?limit=20&skip=0',
      {},
      getToken()
    ),

  getDeviceStatus: (did: string) =>
    gizwitsFetch<GizwitsDeviceStatusResponse>(
      `/app/devdata/${did}/latest`,
      {},
      getToken()
    ),

  controlDevice: (did: string, payload: { attrs: Record<string, unknown> }) =>
    gizwitsFetch<Record<string, never>>(
      `/app/control/${did}`,
      { method: 'POST', body: JSON.stringify(payload) },
      getToken()
    ),

  renameDevice: (did: string, name: string) =>
    gizwitsFetch<Record<string, never>>(
      `/app/bindings/${did}`,
      { method: 'PUT', body: JSON.stringify({ dev_alias: name }) },
      getToken()
    ),
};
