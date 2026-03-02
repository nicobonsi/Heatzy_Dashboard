import { Zone, WeekSchedule } from '@/types';

const ZONES_KEY = 'heatzy_zones';

export function getZones(): Zone[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(ZONES_KEY) ?? '[]') as Zone[];
  } catch {
    return [];
  }
}

export function saveZones(zones: Zone[]): void {
  localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
}

export function createZone(name: string, deviceIds: string[]): Zone {
  return {
    id: crypto.randomUUID(),
    name,
    deviceIds,
    createdAt: Date.now(),
  };
}

export function updateZone(
  id: string,
  updates: Partial<Omit<Zone, 'id' | 'createdAt'>>
): void {
  const zones = getZones();
  const idx = zones.findIndex((z) => z.id === id);
  if (idx !== -1) {
    zones[idx] = { ...zones[idx], ...updates };
    saveZones(zones);
  }
}

export function deleteZone(id: string): void {
  saveZones(getZones().filter((z) => z.id !== id));
}
