'use client';

import { WeekSchedule, ScheduleMode } from '@/types';
import { ScheduleCell } from './ScheduleCell';
import { DAY_LABELS, HOUR_LABELS, nextScheduleMode, SCHEDULE_MODE_CYCLE } from '@/lib/schedule';
import { useState } from 'react';

interface Props {
  schedule: WeekSchedule;
  onCellChange: (day: number, hour: number, mode: ScheduleMode) => void;
  onFillDay?: (day: number, mode: ScheduleMode) => void;
  onFillAll?: (mode: ScheduleMode) => void;
}

export function ScheduleGrid({ schedule, onCellChange, onFillDay, onFillAll }: Props) {
  const [fillMode, setFillMode] = useState<ScheduleMode>('cft');

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
              <button
                className="text-xs font-semibold text-gray-700 py-1 w-full hover:text-blue-600 transition-colors"
                onClick={() => onFillDay?.(d, fillMode)}
                title={`Remplir ${day} avec ${fillMode}`}
              >
                {day}
              </button>
            </div>
          ))}

          {/* Hour rows */}
          {HOUR_LABELS.map((label, hour) => (
            <div key={hour} className="contents">
              <div className="text-right pr-1 text-xs text-gray-400 leading-6 py-0.5">
                {label}
              </div>
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="px-0.5 py-0.5">
                  <ScheduleCell
                    mode={schedule[day][hour]}
                    onClick={() =>
                      onCellChange(day, hour, nextScheduleMode(schedule[day][hour]))
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
        <span className="text-gray-400 italic">Cliquer sur une case pour changer • Cliquer sur le jour pour remplir</span>
      </div>
    </div>
  );
}
