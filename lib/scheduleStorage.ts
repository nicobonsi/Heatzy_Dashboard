import { WeekSchedule } from '@/types';

export type ActivePlan = 'none' | 'primary' | 'alt';

// ── localStorage keys ────────────────────────────────────────────────────────
// 'primary' schedule = the one on the device (cached locally)
// 'alt'     schedule = lives only in localStorage (uploaded on activation)

function schedKey(did: string, which: 'primary' | 'alt') {
  return `heatzy-sched-${which}-${did}`;
}
function activeKey(did: string) {
  return `heatzy-active-${did}`;
}

// ── Schedule read/write ───────────────────────────────────────────────────────
export function loadStoredSchedule(did: string, which: 'primary' | 'alt'): WeekSchedule | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(schedKey(did, which));
    return raw ? (JSON.parse(raw) as WeekSchedule) : null;
  } catch {
    return null;
  }
}

export function saveStoredSchedule(
  did: string,
  which: 'primary' | 'alt',
  schedule: WeekSchedule,
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(schedKey(did, which), JSON.stringify(schedule));
  } catch {}
}

// ── Active plan read/write ────────────────────────────────────────────────────
export function loadActivePlan(did: string): ActivePlan {
  if (typeof window === 'undefined') return 'none';
  return (localStorage.getItem(activeKey(did)) as ActivePlan) ?? 'none';
}

export function saveActivePlan(did: string, active: ActivePlan): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(activeKey(did), active);
}
