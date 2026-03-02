'use client';

import { getStoredToken } from '@/lib/auth';
import {
  AuthToken,
  GizwitsBindingsResponse,
  GizwitsDeviceStatusResponse,
  HeatzyMode,
} from '@/types';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth?.token) {
    headers['x-user-token'] = auth.token;
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    // Redirect to login — token expired
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch<AuthToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getDevices: () => apiFetch<GizwitsBindingsResponse>('/api/devices'),

  getDeviceStatus: (did: string) =>
    apiFetch<GizwitsDeviceStatusResponse>(`/api/devices/${did}/status`),

  controlDevice: (did: string, payload: { attrs: Record<string, unknown> }) =>
    apiFetch<{ ok: boolean }>(`/api/devices/${did}/control`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  renameDevice: (did: string, name: string) =>
    apiFetch<{ ok: boolean }>(`/api/devices/${did}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
};
