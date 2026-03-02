'use client';

import { useState, useEffect, useCallback } from 'react';
import { Device, GizwitsDevice, HeatzyMode } from '@/types';
import { api } from '@/lib/api/client';
import { getDeviceNameOverride } from '@/lib/auth';

function mapDevice(raw: GizwitsDevice): Device {
  const localName = getDeviceNameOverride(raw.did);
  return {
    did: raw.did,
    name: localName ?? raw.dev_alias ?? raw.mac,
    mac: raw.mac,
    isOnline: raw.is_online,
    currentMode: null,
    productName: raw.product_name,
    productKey: raw.product_key,
  };
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
      setDevices(raw.map(mapDevice));
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

  return { devices, loading, error, fetchDevices, updateDeviceMode, updateDeviceName };
}
