'use client';

import { useEffect, useCallback, useRef } from 'react';
import { HeatzyMode } from '@/types';
import { api } from '@/lib/api/client';

export function useDeviceStatus(
  did: string,
  onStatusUpdate: (mode: HeatzyMode, isOnline: boolean) => void,
  intervalMs = 30000
) {
  const callbackRef = useRef(onStatusUpdate);
  callbackRef.current = onStatusUpdate;

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getDeviceStatus(did);
      const mode = data.attr?.mode as HeatzyMode | undefined;
      const isOnline = (data as unknown as { is_online?: boolean }).is_online ?? false;
      if (mode) callbackRef.current(mode, isOnline);
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
