'use client';

import { useState, useCallback, useEffect } from 'react';
import { Zone, WeekSchedule } from '@/types';
import { getZones, saveZones, createZone, updateZone, deleteZone } from '@/lib/zones';

export function useZones() {
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    setZones(getZones());
  }, []);

  const refresh = useCallback(() => setZones(getZones()), []);

  const addZone = useCallback(
    (name: string, deviceIds: string[]): Zone => {
      const zone = createZone(name, deviceIds);
      saveZones([...getZones(), zone]);
      refresh();
      return zone;
    },
    [refresh]
  );

  const renameZone = useCallback(
    (id: string, name: string) => {
      updateZone(id, { name });
      refresh();
    },
    [refresh]
  );

  const removeZone = useCallback(
    (id: string) => {
      deleteZone(id);
      refresh();
    },
    [refresh]
  );

  const setZoneDevices = useCallback(
    (id: string, deviceIds: string[]) => {
      updateZone(id, { deviceIds });
      refresh();
    },
    [refresh]
  );

  const setZoneSchedule = useCallback(
    (id: string, schedule: WeekSchedule) => {
      updateZone(id, { schedule });
      refresh();
    },
    [refresh]
  );

  return { zones, addZone, renameZone, removeZone, setZoneDevices, setZoneSchedule };
}
