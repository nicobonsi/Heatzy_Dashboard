import { ScheduleMode, WeekSchedule } from '@/types';

// ── Bit encoding ────────────────────────────────────────────────────────────
// Official Heatzy OpenAPI format (pX_dataY):
//   key  = p{day}_data{slot}   day=1-7 (Mon-Sun), slot=1-12 (00h-02h … 22h-24h)
//   value = one byte encoding 4 × 30-min sub-slots (MSB first):
//           bits [7:6] sub-slot 1, [5:4] sub-slot 2, [3:2] sub-slot 3, [1:0] sub-slot 4
//           00 = Confort  01 = Éco  10 = Hors-Gel  11 = Arrêt (→ treated as Hors-Gel)

const MODE_TO_BITS: Record<ScheduleMode, number> = {
  cft: 0b00,
  eco: 0b01,
  fro: 0b10,
};

const BITS_TO_MODE: Record<number, ScheduleMode> = {
  0b00: 'cft',
  0b01: 'eco',
  0b10: 'fro',
  0b11: 'fro',
};

function byteToMode(byte: number): ScheduleMode {
  return BITS_TO_MODE[(byte >> 6) & 0b11] ?? 'eco';
}

function modeToByte(mode: ScheduleMode): number {
  const bits = MODE_TO_BITS[mode] ?? 0b01;
  return (bits << 6) | (bits << 4) | (bits << 2) | bits;
}

// ── Decode ───────────────────────────────────────────────────────────────────
// Reads the flat attr object (as returned by GET /app/devdata/{did}/latest)
// and returns a WeekSchedule[day 0-6][hour 0-23].
export function decodeWeekSchedule(attrs: Record<string, unknown>): WeekSchedule {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 12 }, (__, slot) => {
      const key = `p${d + 1}_data${slot + 1}`;
      const byte = typeof attrs[key] === 'number' ? (attrs[key] as number) : 0;
      return byteToMode(byte);
    }).flatMap((mode) => [mode, mode]) // each 2-hour slot → 2 × hourly cells
  );
}

// ── Encode ───────────────────────────────────────────────────────────────────
// Converts a WeekSchedule to the flat pX_dataY dict sent via POST /app/control/{did}.
// Returns Record<string, number> — one integer per key.
export function encodeWeekSchedule(schedule: WeekSchedule): Record<string, number> {
  const result: Record<string, number> = {};
  for (let d = 0; d < 7; d++) {
    for (let slot = 0; slot < 12; slot++) {
      // Use the first of the two hours in each 2-hour slot
      const mode = schedule[d][slot * 2] ?? 'eco';
      result[`p${d + 1}_data${slot + 1}`] = modeToByte(mode);
    }
  }
  return result;
}

// ── Defaults ─────────────────────────────────────────────────────────────────
export function createDefaultWeekSchedule(): WeekSchedule {
  return Array.from({ length: 7 }, () => new Array(24).fill('eco' as ScheduleMode));
}

// ── Labels ───────────────────────────────────────────────────────────────────
export const DAY_LABELS      = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const HOUR_LABELS     = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}h`
);

export const SCHEDULE_MODE_OPTIONS: { value: ScheduleMode; label: string; color: string }[] = [
  { value: 'cft', label: 'Confort',  color: 'bg-orange-400' },
  { value: 'eco', label: 'Éco',      color: 'bg-emerald-400' },
  { value: 'fro', label: 'Hors Gel', color: 'bg-blue-300' },
];

export const SCHEDULE_MODE_CYCLE: ScheduleMode[] = ['cft', 'eco', 'fro'];

export function nextScheduleMode(current: ScheduleMode): ScheduleMode {
  const idx = SCHEDULE_MODE_CYCLE.indexOf(current);
  return SCHEDULE_MODE_CYCLE[(idx + 1) % SCHEDULE_MODE_CYCLE.length];
}
