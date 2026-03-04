'use client';

import { useState, useCallback } from 'react';
import { WeekSchedule, ScheduleMode } from '@/types';
import {
  decodeWeekSchedule,
  encodeWeekSchedule,
  createDefaultWeekSchedule,
  copyDay as copyDayHelper,
} from '@/lib/schedule';
import { api } from '@/lib/api/client';

export function useSchedule(did: string) {
  const [schedule, setSchedule] = useState<WeekSchedule>(createDefaultWeekSchedule());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDeviceStatus(did);
      const raw = data.attr as Record<string, unknown>;
      setSchedule(decodeWeekSchedule(raw));
    } catch {
      setSchedule(createDefaultWeekSchedule());
    } finally {
      setLoading(false);
    }
  }, [did]);

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

  const saveSchedule = useCallback(async () => {
    setSaving(true);
    try {
      const encoded: Record<string, unknown> = encodeWeekSchedule(schedule);
      await api.controlDevice(did, { attrs: encoded });
    } finally {
      setSaving(false);
    }
  }, [did, schedule]);

  return { schedule, loading, saving, loadSchedule, updateCell, fillDay, fillAll, copyDay, saveSchedule };
}
