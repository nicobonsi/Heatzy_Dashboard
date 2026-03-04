'use client';

import { useState, useCallback } from 'react';
import { WeekSchedule, ScheduleMode } from '@/types';
import {
  decodeWeekSchedule,
  encodeWeekSchedule,
  createDefaultWeekSchedule,
  copyDay as copyDayHelper,
} from '@/lib/schedule';
import {
  loadStoredSchedule,
  saveStoredSchedule,
  loadActivePlan,
} from '@/lib/scheduleStorage';
import { api } from '@/lib/api/client';

export function useSchedule(did: string, which: 'primary' | 'alt' = 'primary') {
  const [schedule, setSchedule] = useState<WeekSchedule>(createDefaultWeekSchedule());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (which === 'alt') {
      // Alt schedule lives only in localStorage
      const stored = loadStoredSchedule(did, 'alt');
      setSchedule(stored ?? createDefaultWeekSchedule());
      return;
    }

    // Primary: load from device and cache locally
    setLoading(true);
    try {
      const data = await api.getDeviceStatus(did);
      const raw = data.attr as Record<string, unknown>;
      const decoded = decodeWeekSchedule(raw);
      setSchedule(decoded);
      saveStoredSchedule(did, 'primary', decoded);
    } catch {
      // Fall back to cached version
      const cached = loadStoredSchedule(did, 'primary');
      setSchedule(cached ?? createDefaultWeekSchedule());
    } finally {
      setLoading(false);
    }
  }, [did, which]);

  const updateCell = useCallback((day: number, hour: number, mode: ScheduleMode) => {
    setSchedule((prev) => {
      const next = prev.map((d) => [...d]) as WeekSchedule;
      next[day][hour] = mode;
      return next;
    });
  }, []);

  const fillDay = useCallback((day: number, mode: ScheduleMode) => {
    setSchedule((prev) => {
      const next = prev.map((d) => [...d]) as WeekSchedule;
      next[day] = new Array(48).fill(mode);
      return next;
    });
  }, []);

  const fillAll = useCallback((mode: ScheduleMode) => {
    setSchedule(Array.from({ length: 7 }, () => new Array(48).fill(mode)));
  }, []);

  const copyDay = useCallback((from: number, to: number) => {
    setSchedule((prev) => copyDayHelper(prev, from, to));
  }, []);

  const applyPreset = useCallback((days: number[], pattern: ScheduleMode[]) => {
    setSchedule((prev) => {
      const next = prev.map((d) => [...d]) as WeekSchedule;
      for (const day of days) next[day] = [...pattern];
      return next;
    });
  }, []);

  const saveSchedule = useCallback(async () => {
    setSaving(true);
    try {
      // Always persist to localStorage
      saveStoredSchedule(did, which, schedule);

      // Upload to device:
      //   primary → always, unless alt is currently active (alt has the device slot)
      //   alt     → only when alt is currently the active plan on the device
      const active = loadActivePlan(did);
      const shouldUpload =
        which === 'primary' ? active !== 'alt' : active === 'alt';

      if (shouldUpload) {
        const encoded: Record<string, unknown> = encodeWeekSchedule(schedule);
        await api.controlDevice(did, { attrs: encoded });
      }

      return { uploadedToDevice: shouldUpload };
    } finally {
      setSaving(false);
    }
  }, [did, which, schedule]);

  return {
    schedule,
    loading,
    saving,
    loadSchedule,
    updateCell,
    fillDay,
    fillAll,
    copyDay,
    applyPreset,
    saveSchedule,
  };
}
