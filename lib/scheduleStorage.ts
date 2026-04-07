import { WeekSchedule } from '@/types';

export type ActivePlan = 'none' | 'primary' | 'alt';

// ── localStorage keys ────────────────────────────────────────────────────────
// 'primary' schedule = the one on the device (cached locally)
// 'alt'     schedule = lives only in localStorage (uploaded on activation)
// 'saved'   flag     = set only when user explicitly clicks Save (not on auto-cache)

function schedKey(did: string, which: 'primary' | 'alt') {
  return `heatzy-sched-${which}-${did}`;
}
function activeKey(did: string) {
  return `heatzy-active-${did}`;
}
function savedFlagKey(did: string, which: 'primary' | 'alt') {
  return `heatzy-sched-saved-${which}-${did}`;
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

// ── Explicit-save flag ───────────────────────────────────────────────────────
// Distinct from the auto-cache written on schedule load. Only set when user
// clicks "Save" in the modal — used to gate the toggle.
export function hasSavedSchedule(did: string, which: 'primary' | 'alt'): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(savedFlagKey(did, which)) === '1';
}

export function markScheduleSaved(did: string, which: 'primary' | 'alt'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(savedFlagKey(did, which), '1');
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
