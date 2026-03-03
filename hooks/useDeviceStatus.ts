'use client';

import { useEffect, useCallback, useRef } from 'react';
import { HeatzyMode, PiloteProAttrs, DerogationMode } from '@/types';
import { api } from '@/lib/api/client';

export interface DeviceStatusUpdate {
  mode: HeatzyMode;
  isOnline: boolean;
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
      const isOnline = (data as unknown as { is_online?: boolean }).is_online ?? false;
      if (mode) {
        callbackRef.current({
          mode,
          isOnline,
          proAttrs: extractProAttrs(attr),
        });
      }
    } catch {
      // silently fail on polling — don't disrupt the UI
    }
  }, [did]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, intervalMs);
    return () => clearInterval(id);
  }, [fetchStatus, intervalMs]);

  return { refetch: fetchStatus };
}
