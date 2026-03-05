'use client';

import { useState, useEffect, useCallback } from 'react';
import { Device, GizwitsDevice, HeatzyMode, PiloteProAttrs, DerogationMode } from '@/types';
import { api } from '@/lib/api/client';
import { getDeviceNameOverride } from '@/lib/auth';

function mapDevice(
  raw: GizwitsDevice,
  currentMode: HeatzyMode | null = null,
  proAttrs?: PiloteProAttrs,
  timerSwitch?: 0 | 1,
): Device {
  const localName = getDeviceNameOverride(raw.did);
  return {
    did: raw.did,
    name: localName ?? raw.dev_alias ?? raw.mac,
    mac: raw.mac,
    isOnline: raw.is_online,
    currentMode,
    productName: raw.product_name,
    productKey: raw.product_key,
    timerSwitch,
    proAttrs,
  };
}

function extractAttrs(attr: Record<string, unknown>): {
  mode: HeatzyMode | null;
  proAttrs: PiloteProAttrs | undefined;
  timerSwitch: 0 | 1 | undefined;
} {
  const mode = (attr.mode as HeatzyMode | undefined) ?? null;
  const timerSwitch = attr.timer_switch as 0 | 1 | undefined;
  const hasPro =
    attr.cur_temp      !== undefined ||
    attr.cft_temp      !== undefined ||
    attr.eco_temp      !== undefined ||
    attr.window_switch !== undefined ||
    attr.derog_mode    !== undefined ||
    attr.lock_switch   !== undefined;
  const proAttrs: PiloteProAttrs | undefined = hasPro
    ? {
        cur_temp:      attr.cur_temp      as number | undefined,
        cur_humi:      attr.cur_humi      as number | undefined,
        cft_temp:      attr.cft_temp      as number | undefined,
        eco_temp:      attr.eco_temp      as number | undefined,
        window_switch: attr.window_switch as 0 | 1 | undefined,
        derog_mode:    attr.derog_mode    as DerogationMode | undefined,
        derog_time:    attr.derog_time    as number | undefined,
        lock_switch:   attr.lock_switch   as 0 | 1 | undefined,
        timer_switch:  attr.timer_switch  as 0 | 1 | undefined,
        temp_offset:      attr.temp_offset      as number | undefined,
        temp_step:        attr.temp_step        as number | undefined,
        eco_responsible:  attr.eco_responsible  as 0 | 1 | undefined,
      }
    : undefined;
  return { mode, proAttrs, timerSwitch };
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDevices();
      const raw = data.devices ?? [];

      // Fetch all device statuses in parallel
      const statuses = await Promise.allSettled(
        raw.map((d) => api.getDeviceStatus(d.did))
      );

      setDevices((prev) => {
        const prevMap = new Map(prev.map((d) => [d.did, d]));
        return raw.map((rawDevice, i) => {
          const existing = prevMap.get(rawDevice.did);
          const result = statuses[i];
          let currentMode: HeatzyMode | null = existing?.currentMode ?? null;
          let proAttrs = existing?.proAttrs;

          let timerSwitch = existing?.timerSwitch;
          if (result.status === 'fulfilled') {
            const attr = (result.value.attr ?? {}) as Record<string, unknown>;
            const extracted = extractAttrs(attr);
            if (extracted.mode) currentMode = extracted.mode;
            if (extracted.proAttrs) proAttrs = extracted.proAttrs;
            if (extracted.timerSwitch !== undefined) timerSwitch = extracted.timerSwitch;
          }

          return mapDevice(rawDevice, currentMode, proAttrs, timerSwitch);
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const updateDeviceMode = useCallback((did: string, mode: HeatzyMode) => {
    setDevices((prev) =>
      prev.map((d) => (d.did === did ? { ...d, currentMode: mode } : d))
    );
  }, []);

  const updateDeviceName = useCallback((did: string, name: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.did === did ? { ...d, name } : d))
    );
  }, []);

  const updateDeviceStatus = useCallback(
    (did: string, mode: HeatzyMode, isOnline: boolean, proAttrs?: PiloteProAttrs) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.did === did ? { ...d, currentMode: mode, isOnline, proAttrs: proAttrs ?? d.proAttrs } : d
        )
      );
    },
    []
  );

  const updateDeviceTimerSwitch = useCallback((did: string, value: 0 | 1) => {
    setDevices((prev) =>
      prev.map((d) => (d.did === did ? { ...d, timerSwitch: value } : d))
    );
  }, []);

  return { devices, loading, error, fetchDevices, updateDeviceMode, updateDeviceName, updateDeviceStatus, updateDeviceTimerSwitch };
}
