'use client';

import { WeekSchedule, ScheduleMode } from '@/types';
import { ScheduleCell } from './ScheduleCell';
import { DAY_LABELS, HALF_HOUR_LABELS, SCHEDULE_PRESETS, nextScheduleMode } from '@/lib/schedule';
import { useState } from 'react';

// Preset circle colours (P=blue, P1=amber, P2=orange, P3=violet, P4=emerald, P5=rose)
const PRESET_COLORS = [
  'bg-blue-600 hover:bg-blue-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-orange-500 hover:bg-orange-600',
  'bg-violet-500 hover:bg-violet-600',
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-rose-500 hover:bg-rose-600',
];

interface Props {
  schedule: WeekSchedule;
  onCellChange: (day: number, slot: number, mode: ScheduleMode) => void;
  onFillDay?: (day: number, mode: ScheduleMode) => void;
  onFillAll?: (mode: ScheduleMode) => void;
  onCopyDay?: (from: number, to: number) => void;
  onApplyPreset?: (days: number[], pattern: ScheduleMode[]) => void;
}

export function ScheduleGrid({ schedule, onCellChange, onCopyDay, onApplyPreset }: Props) {
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [copySource, setCopySource] = useState<number | null>(null);

  const now = new Date();
  const currentSlot = now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
  const currentDay = (now.getDay() + 6) % 7;

  const toggleDaySelection = (d: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const handleDayHeaderClick = (d: number) => {
    if (onCopyDay && copySource !== null) {
      if (copySource !== d) onCopyDay(copySource, d);
      setCopySource(null);
    } else {
      toggleDaySelection(d);
    }
  };

  const handlePresetApply = (pattern: ScheduleMode[]) => {
    if (!onApplyPreset) return;
    const days = selectedDays.size > 0 ? Array.from(selectedDays) : [0, 1, 2, 3, 4, 5, 6];
    onApplyPreset(days, pattern);
    setSelectedDays(new Set());
  };

  const allSelected = selectedDays.size === 7;
  const noneSelected = selectedDays.size === 0;

  return (
    <div className="space-y-3">
      {/* Preset controls */}
      <div className="space-y-2 pb-2 border-b">
        {/* Preset circles row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0">Programmes :</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SCHEDULE_PRESETS.map((preset, i) => (
              <button
                key={preset.id}
                onClick={() => handlePresetApply(preset.pattern)}
                title={preset.description}
                className={`w-8 h-8 rounded-full text-white text-[11px] font-bold shadow-sm transition-colors flex items-center justify-center ${PRESET_COLORS[i]}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 italic">
            {noneSelected
              ? 'Sélectionnez des jours ↓ ou applique à toute la semaine'
              : allSelected
              ? 'Toute la semaine sélectionnée'
              : `${selectedDays.size} jour${selectedDays.size > 1 ? 's' : ''} sélectionné${selectedDays.size > 1 ? 's' : ''}`}
          </span>
          {copySource !== null && (
            <button
              onClick={() => setCopySource(null)}
              className="ml-auto px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 font-medium text-xs"
            >
              ✕ Annuler la copie
            </button>
          )}
        </div>

        {/* Preset legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
          {SCHEDULE_PRESETS.map((preset, i) => (
            <span key={preset.id} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${PRESET_COLORS[i].split(' ')[0]}`} />
              <span className="font-medium text-gray-500">{preset.label}</span>
              <span>{preset.description}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[500px]"
          style={{ gridTemplateColumns: `3rem repeat(7, 1fr)` }}
        >
          {/* Header */}
          <div />
          {DAY_LABELS.map((day, d) => {
            const isSelected = selectedDays.has(d);
            const isCopySource = copySource === d;
            const isPasteTarget = copySource !== null && !isCopySource;
            return (
              <div key={day} className="text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => handleDayHeaderClick(d)}
                    title={
                      isCopySource
                        ? `Source : ${day}`
                        : isPasteTarget
                        ? `Coller sur ${day}`
                        : isSelected
                        ? `Désélectionner ${day}`
                        : `Sélectionner ${day}`
                    }
                    className={`text-xs font-semibold py-0.5 px-1.5 rounded transition-colors ${
                      isCopySource
                        ? 'text-blue-600'
                        : isPasteTarget
                        ? 'text-green-600 hover:bg-green-50 underline'
                        : isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : d === currentDay
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day}
                    {isSelected && (
                      <span className="block mx-auto mt-0.5 text-blue-600 text-[8px] leading-none">✓</span>
                    )}
                    {!isSelected && d === currentDay && copySource === null && (
                      <span className="block mx-auto mt-0.5 w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </button>
                  {onCopyDay && (
                    <button
                      onClick={() => setCopySource(isCopySource ? null : d)}
                      title={isCopySource ? 'Annuler' : `Copier ${day}`}
                      className={`text-[10px] px-0.5 rounded transition-colors leading-none ${
                        isCopySource ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      ⎘
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Half-hour rows */}
          {HALF_HOUR_LABELS.map((label, slot) => (
            <div key={slot} className="contents">
              {/* Time label */}
              <div className="flex items-center justify-end pr-1 gap-0.5 py-0.5">
                {slot === currentSlot && (
                  <span className="text-blue-500 text-[9px] leading-none">▶</span>
                )}
                {slot % 2 === 0 ? (
                  <span className="text-[10px] text-gray-500">{label}</span>
                ) : (
                  <span className="text-[9px] text-gray-300">:30</span>
                )}
              </div>

              {Array.from({ length: 7 }, (_, day) => (
                <div
                  key={day}
                  className={`px-0.5 py-0.5 ${
                    selectedDays.has(day)
                      ? 'bg-blue-100/50'
                      : day === currentDay
                      ? 'bg-blue-50'
                      : ''
                  }`}
                >
                  <ScheduleCell
                    mode={schedule[day][slot]}
                    onClick={() =>
                      onCellChange(day, slot, nextScheduleMode(schedule[day][slot]))
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Confort
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Éco
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-300 inline-block" /> Hors Gel
        </span>
        <span className="text-gray-400 italic">Cliquer sur une case pour changer • ⎘ pour copier un jour</span>
      </div>
    </div>
  );
}
