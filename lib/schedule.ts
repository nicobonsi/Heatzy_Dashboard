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
  0b11: 'fro', // Arrêt → treated as Hors-Gel
};

// ── Decode ───────────────────────────────────────────────────────────────────
// Reads the flat attr object (as returned by GET /app/devdata/{did}/latest)
// and returns a WeekSchedule[day 0-6][halfhour 0-47].
// Each 2-hour API slot encodes 4 × 30-min sub-slots in one byte (MSB first).
export function decodeWeekSchedule(attrs: Record<string, unknown>): WeekSchedule {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 12 }, (__, slot) => {
      const key  = `p${d + 1}_data${slot + 1}`;
      const byte = typeof attrs[key] === 'number' ? (attrs[key] as number) : 0;
      // Extract all 4 × 30-min sub-slots from the byte
      return [
        BITS_TO_MODE[(byte >> 6) & 0b11] ?? 'eco',
        BITS_TO_MODE[(byte >> 4) & 0b11] ?? 'eco',
        BITS_TO_MODE[(byte >> 2) & 0b11] ?? 'eco',
        BITS_TO_MODE[byte        & 0b11] ?? 'eco',
      ] as ScheduleMode[];
    }).flat() // 12 slots × 4 sub-slots = 48 half-hours per day
  );
}

// ── Encode ───────────────────────────────────────────────────────────────────
// Converts a WeekSchedule to the flat pX_dataY dict sent via POST /app/control/{did}.
// Each byte packs 4 individual 30-min sub-slots (MSB first).
export function encodeWeekSchedule(schedule: WeekSchedule): Record<string, number> {
  const result: Record<string, number> = {};
  for (let d = 0; d < 7; d++) {
    for (let slot = 0; slot < 12; slot++) {
      const base = slot * 4;
      const b0 = MODE_TO_BITS[schedule[d][base]     ?? 'eco'] ?? 0b01;
      const b1 = MODE_TO_BITS[schedule[d][base + 1] ?? 'eco'] ?? 0b01;
      const b2 = MODE_TO_BITS[schedule[d][base + 2] ?? 'eco'] ?? 0b01;
      const b3 = MODE_TO_BITS[schedule[d][base + 3] ?? 'eco'] ?? 0b01;
      result[`p${d + 1}_data${slot + 1}`] = (b0 << 6) | (b1 << 4) | (b2 << 2) | b3;
    }
  }
  return result;
}

// ── Defaults ─────────────────────────────────────────────────────────────────
export function createDefaultWeekSchedule(): WeekSchedule {
  return Array.from({ length: 7 }, () => new Array(48).fill('eco' as ScheduleMode));
}

// ── Copy day ─────────────────────────────────────────────────────────────────
export function copyDay(schedule: WeekSchedule, from: number, to: number): WeekSchedule {
  const next = schedule.map((d) => [...d]) as WeekSchedule;
  next[to] = [...schedule[from]];
  return next;
}

// ── Labels ───────────────────────────────────────────────────────────────────
export const DAY_LABELS      = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// 48 half-hour labels: "00:00", "00:30", "01:00", … "23:30"
export const HALF_HOUR_LABELS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min  = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

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

// ── Presets ───────────────────────────────────────────────────────────────────
// Six built-in programme templates matching the Heatzy iOS/Android app.
// Each preset is a 48-slot array (30-min granularity, Mon-Sun index).
function makePreset(rules: Array<[number, number, ScheduleMode]>): ScheduleMode[] {
  const slots = new Array(48).fill('eco' as ScheduleMode);
  for (const [startH, endH, mode] of rules) {
    for (let i = startH * 2; i < endH * 2; i++) slots[i] = mode;
  }
  return slots;
}

export const SCHEDULE_PRESETS: { id: string; label: string; description: string; pattern: ScheduleMode[] }[] = [
  {
    id: 'P',
    label: 'P',
    description: 'Journée de travail — Confort 6h-9h et 17h-22h',
    pattern: makePreset([[6, 9, 'cft'], [17, 22, 'cft']]),
  },
  {
    id: 'P1',
    label: 'P1',
    description: 'Présence matin — Confort 6h-13h',
    pattern: makePreset([[6, 13, 'cft']]),
  },
  {
    id: 'P2',
    label: 'P2',
    description: 'Présence journée — Confort 7h-20h',
    pattern: makePreset([[7, 20, 'cft']]),
  },
  {
    id: 'P3',
    label: 'P3',
    description: 'Présence soirée — Confort 17h-23h',
    pattern: makePreset([[17, 23, 'cft']]),
  },
  {
    id: 'P4',
    label: 'P4',
    description: 'Absence — Tout Éco',
    pattern: new Array(48).fill('eco' as ScheduleMode),
  },
  {
    id: 'P5',
    label: 'P5',
    description: 'Confort continu — Toute la journée',
    pattern: new Array(48).fill('cft' as ScheduleMode),
  },
];
