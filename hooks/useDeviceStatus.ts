'use client';

import { useEffect, useCallback, useRef } from 'react';
import { HeatzyMode, PiloteProAttrs, DerogationMode } from '@/types';
import { api } from '@/lib/api/client';
import { wsManager } from '@/lib/wsManager';

export interface DeviceStatusUpdate {
  mode: HeatzyMode;
  isOnline?: boolean; // undefined when the devdata endpoint doesn't return this field
  proAttrs?: PiloteProAttrs;
}

function extractProAttrs(attr: Record<string, unknown>): PiloteProAttrs | undefined {
  // Only return proAttrs if the device exposes at least one Pro-specific attribute
  const hasPro =
    attr.cur_temp !== undefined ||
    attr.cft_temp !== undefined ||
    attr.eco_temp !== undefined;
  if (!hasPro) return undefined;

  return {
    cur_temp:      attr.cur_temp      as number | undefined,
    cur_humi:      attr.cur_humi      as number | undefined,
    cft_temp:      attr.cft_temp      as number | undefined,
    eco_temp:      attr.eco_temp      as number | undefined,
    window_switch: attr.window_switch as 0 | 1 | undefined,
    derog_mode:    attr.derog_mode    as DerogationMode | undefined,
    derog_time:    attr.derog_time    as number | undefined,
    lock_switch:   attr.lock_switch   as 0 | 1 | undefined,
    timer_switch:  attr.timer_switch  as 0 | 1 | undefined,
  };
}

export function useDeviceStatus(
  did: string,
  onStatusUpdate: (update: DeviceStatusUpdate) => void,
  intervalMs = 30000
) {
  const callbackRef = useRef(onStatusUpdate);
  callbackRef.current = onStatusUpdate;

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getDeviceStatus(did);
      const attr = (data.attr ?? {}) as Record<string, unknown>;
      const mode = attr.mode as HeatzyMode | undefined;
      // is_online is not returned by /app/devdata — only include it if present
      const isOnlineRaw = (data as unknown as { is_online?: boolean }).is_online;
      if (mode) {
        callbackRef.current({
          mode,
          ...(isOnlineRaw !== undefined && { isOnline: isOnlineRaw }),
          proAttrs: extractProAttrs(attr),
        });
      }
    } catch {
      // silently fail on polling — don't disrupt the UI
    }
  }, [did]);

  useEffect(() => {
    // Don't poll when the tab is hidden — resume + immediate fetch on visibility
    if (typeof document === 'undefined') return;

    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      fetchStatus();
      id = setInterval(fetchStatus, intervalMs);
    };

    const stop = () => {
      if (id !== null) { clearInterval(id); id = null; }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        start();
      }
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStatus, intervalMs]);

  // WebSocket: real-time push updates (same path as polling → suppress logic applies)
  useEffect(() => {
    const unsubscribe = wsManager?.subscribe(did, (attr) => {
      const mode = attr.mode as HeatzyMode | undefined;
      if (mode) {
        callbackRef.current({ mode, proAttrs: extractProAttrs(attr) });
      }
    });
    return unsubscribe;
  }, [did]);

  return { refetch: fetchStatus };
}
