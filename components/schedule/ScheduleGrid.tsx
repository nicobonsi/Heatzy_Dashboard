'use client';

import { WeekSchedule, ScheduleMode } from '@/types';
import { ScheduleCell } from './ScheduleCell';
import { DAY_LABELS, HALF_HOUR_LABELS, nextScheduleMode, SCHEDULE_MODE_CYCLE } from '@/lib/schedule';
import { useState } from 'react';

interface Props {
  schedule: WeekSchedule;
  onCellChange: (day: number, slot: number, mode: ScheduleMode) => void;
  onFillDay?: (day: number, mode: ScheduleMode) => void;
  onFillAll?: (mode: ScheduleMode) => void;
  onCopyDay?: (from: number, to: number) => void;
}

export function ScheduleGrid({ schedule, onCellChange, onFillDay, onFillAll, onCopyDay }: Props) {
  const [fillMode, setFillMode] = useState<ScheduleMode>('cft');
  const [copySource, setCopySource] = useState<number | null>(null);

  const now = new Date();
  const currentSlot = now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
  // JS getDay(): 0=Sun … 6=Sat → our Mon-first index: (getDay()+6)%7
  const currentDay = (now.getDay() + 6) % 7;

  const handleDayHeaderClick = (d: number) => {
    if (onCopyDay && copySource !== null) {
      if (copySource !== d) {
        onCopyDay(copySource, d);
      }
      setCopySource(null);
    } else {
      onFillDay?.(d, fillMode);
    }
  };

  return (
    <div className="space-y-3">
      {/* Fill controls */}
      {(onFillDay || onFillAll) && (
        <div className="flex flex-wrap items-center gap-2 text-xs pb-2 border-b">
          <span className="text-gray-500 font-medium">Remplir avec :</span>
          {SCHEDULE_MODE_CYCLE.map((m) => (
            <button
              key={m}
              onClick={() => setFillMode(m)}
              className={`px-2 py-1 rounded font-medium border transition-colors ${
                fillMode === m ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'cft' ? 'Confort' : m === 'eco' ? 'Éco' : 'Hors Gel'}
            </button>
          ))}
          {onFillAll && (
            <button
              onClick={() => onFillAll(fillMode)}
              className="ml-2 px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium border border-gray-200"
            >
              Tout remplir
            </button>
          )}
          {copySource !== null && (
            <button
              onClick={() => setCopySource(null)}
              className="ml-auto px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 font-medium"
            >
              ✕ Annuler la copie
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[500px]"
          style={{ gridTemplateColumns: `3rem repeat(7, 1fr)` }}
        >
          {/* Header */}
          <div />
          {DAY_LABELS.map((day, d) => (
            <div key={day} className="text-center">
              <div className="flex items-center justify-center gap-0.5">
                <button
                  className={`text-xs font-semibold py-1 transition-colors ${
                    copySource === d
                      ? 'text-blue-600'
                      : copySource !== null
                      ? 'text-green-600 hover:text-green-700 underline'
                      : d === currentDay
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                  onClick={() => handleDayHeaderClick(d)}
                  title={
                    copySource === d
                      ? `Source : ${day}`
                      : copySource !== null
                      ? `Coller sur ${day}`
                      : `Remplir ${day} avec ${fillMode}`
                  }
                >
                  {day}
                  {d === currentDay && copySource === null && (
                    <span className="block mx-auto mt-0.5 w-1 h-1 rounded-full bg-blue-500" />
                  )}
                </button>
                {onCopyDay && (
                  <button
                    onClick={() => setCopySource(copySource === d ? null : d)}
                    title={copySource === d ? 'Annuler' : `Copier ${day}`}
                    className={`text-[10px] px-0.5 rounded transition-colors leading-none ${
                      copySource === d
                        ? 'text-blue-600'
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    ⎘
                  </button>
                )}
              </div>
            </div>
          ))}

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
                <div key={day} className={`px-0.5 py-0.5 ${day === currentDay ? 'bg-blue-50' : ''}`}>
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
        <span className="text-gray-400 italic">Cliquer sur une case pour changer • Cliquer sur le jour pour remplir • ⎘ pour copier</span>
      </div>
    </div>
  );
}
