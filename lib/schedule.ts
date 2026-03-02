import { ScheduleMode, WeekSchedule } from '@/types';

// Mode → 2-bit encoding for schedule slots
// 00 = Confort, 01 = Eco, 10 = Hors Gel
const MODE_TO_BITS: Record<ScheduleMode, number> = {
  cft: 0b00,
  eco: 0b01,
  fro: 0b10,
};

const BITS_TO_MODE: Record<number, ScheduleMode> = {
  0b00: 'cft',
  0b01: 'eco',
  0b10: 'fro',
  0b11: 'fro', // treat stop as frost-protection in schedule context
};

// Each API day slot = 12 values (one per 2-hour block: 00-02, 02-04, ..., 22-24)
// Each value is a byte encoding 4 × 30-min sub-slots in pairs of bits (MSB first)
// Bits [7:6] = sub-slot 1 (earliest), [5:4] = sub-slot 2, [3:2] = sub-slot 3, [1:0] = sub-slot 4

export function decodeDay(rawDay: number[]): ScheduleMode[] {
  const hours: ScheduleMode[] = [];
  for (let slot = 0; slot < 12; slot++) {
    const byte = rawDay[slot] ?? 0;
    // Take the dominant mode from bits [7:6]
    const modeBits = (byte >> 6) & 0b11;
    const mode = BITS_TO_MODE[modeBits] ?? 'cft';
    // Each slot = 2 hours
    hours.push(mode, mode);
  }
  return hours; // length 24
}

export function encodeDay(hours: ScheduleMode[]): number[] {
  const slots: number[] = [];
  for (let slot = 0; slot < 12; slot++) {
    const hour = slot * 2;
    const mode = hours[hour] ?? 'eco';
    const bits = MODE_TO_BITS[mode] ?? 0;
    // All 4 sub-slots set to the same mode
    const byte = (bits << 6) | (bits << 4) | (bits << 2) | bits;
    slots.push(byte);
  }
  return slots; // length 12
}

// rawWeek: { P0: number[], P1: number[], ..., P6: number[] } (Mon=P0 ... Sun=P6)
export function decodeWeekSchedule(rawWeek: Record<string, unknown>): WeekSchedule {
  const days: WeekSchedule = [];
  for (let d = 0; d < 7; d++) {
    const key = `P${d}`;
    const rawDay = Array.isArray(rawWeek[key]) ? (rawWeek[key] as number[]) : new Array(12).fill(0);
    days.push(decodeDay(rawDay));
  }
  return days;
}

export function encodeWeekSchedule(schedule: WeekSchedule): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (let d = 0; d < 7; d++) {
    result[`P${d}`] = encodeDay(schedule[d]);
  }
  return result;
}

export function createDefaultWeekSchedule(): WeekSchedule {
  return Array.from({ length: 7 }, () => new Array(24).fill('eco' as ScheduleMode));
}

export const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}h`
);

export const SCHEDULE_MODE_OPTIONS: { value: ScheduleMode; label: string; color: string }[] = [
  { value: 'cft', label: 'Confort', color: 'bg-orange-400' },
  { value: 'eco', label: 'Eco', color: 'bg-emerald-400' },
  { value: 'fro', label: 'Hors Gel', color: 'bg-blue-300' },
];

export const SCHEDULE_MODE_CYCLE: ScheduleMode[] = ['cft', 'eco', 'fro'];

export function nextScheduleMode(current: ScheduleMode): ScheduleMode {
  const idx = SCHEDULE_MODE_CYCLE.indexOf(current);
  return SCHEDULE_MODE_CYCLE[(idx + 1) % SCHEDULE_MODE_CYCLE.length];
}
