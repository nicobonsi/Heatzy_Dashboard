'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { WeekSchedule, ScheduleMode } from '@/types';
import { DAY_LABELS, SCHEDULE_PRESETS } from '@/lib/schedule';

const PRESET_COLORS = [
  'bg-blue-600 hover:bg-blue-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-orange-500 hover:bg-orange-600',
  'bg-violet-500 hover:bg-violet-600',
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-rose-500 hover:bg-rose-600',
];

const MODE_META: Record<ScheduleMode, { label: string; bar: string; ring: string }> = {
  cft: { label: 'Confort',  bar: 'bg-orange-400', ring: 'ring-orange-400' },
  eco: { label: 'Éco',      bar: 'bg-emerald-400', ring: 'ring-emerald-400' },
  fro: { label: 'Hors Gel', bar: 'bg-blue-300',   ring: 'ring-blue-300' },
};

// Hour markers on the axis
const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

interface Props {
  schedule: WeekSchedule;
  onCellChange: (day: number, slot: number, mode: ScheduleMode) => void;
  onFillDay?: (day: number, mode: ScheduleMode) => void;
  onCopyDay?: (from: number, to: number) => void;
  onApplyPreset?: (days: number[], pattern: ScheduleMode[]) => void;
}

export function ScheduleTimeline({ schedule, onCellChange, onFillDay, onCopyDay, onApplyPreset }: Props) {
  const [brushMode, setBrushMode] = useState<ScheduleMode>('cft');
  const [copySource, setCopySource] = useState<number | null>(null);
  const [pasteTargets, setPasteTargets] = useState<Set<number>>(new Set());
  const [hoveredSlot, setHoveredSlot] = useState<{ day: number; slot: number } | null>(null);

  // Drag state via refs (avoids stale closure issues in event listeners)
  const isDraggingRef = useRef(false);
  const dragDayRef    = useRef<number | null>(null);
  const lastSlotRef   = useRef<number | null>(null);
  const barRefs       = useRef<(HTMLDivElement | null)[]>([]);

  // Current time
  const now            = new Date();
  const currentDay     = (now.getDay() + 6) % 7;
  const currentSlot    = now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
  const currentTimePct = (currentSlot / 48) * 100;

  const getSlotFromX = useCallback((clientX: number, bar: HTMLDivElement): number => {
    const rect = bar.getBoundingClientRect();
    const x    = Math.max(0, Math.min(clientX - rect.left, rect.width - 1));
    return Math.floor((x / rect.width) * 48);
  }, []);

  const paintSlot = useCallback(
    (day: number, slot: number) => {
      if (slot !== lastSlotRef.current) {
        onCellChange(day, slot, brushMode);
        lastSlotRef.current = slot;
      }
    },
    [brushMode, onCellChange],
  );

  // ── Mouse events ─────────────────────────────────────────────────────────────
  const handleBarMouseDown = useCallback(
    (day: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (copySource !== null) return;
      e.preventDefault();
      isDraggingRef.current = true;
      dragDayRef.current    = day;
      lastSlotRef.current   = null;
      const bar = barRefs.current[day];
      if (bar) paintSlot(day, getSlotFromX(e.clientX, bar));
    },
    [copySource, getSlotFromX, paintSlot],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || dragDayRef.current === null) return;
      const bar = barRefs.current[dragDayRef.current];
      if (bar) paintSlot(dragDayRef.current, getSlotFromX(e.clientX, bar));
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      dragDayRef.current    = null;
      lastSlotRef.current   = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [getSlotFromX, paintSlot]);

  // ── Touch events ─────────────────────────────────────────────────────────────
  const handleBarTouchStart = useCallback(
    (day: number, e: React.TouchEvent<HTMLDivElement>) => {
      if (copySource !== null) return;
      isDraggingRef.current = true;
      dragDayRef.current    = day;
      lastSlotRef.current   = null;
      const bar = barRefs.current[day];
      if (bar && e.touches[0]) paintSlot(day, getSlotFromX(e.touches[0].clientX, bar));
    },
    [copySource, getSlotFromX, paintSlot],
  );

  const handleBarTouchMove = useCallback(
    (day: number, e: React.TouchEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || dragDayRef.current !== day) return;
      e.preventDefault();
      const bar = barRefs.current[day];
      if (bar && e.touches[0]) paintSlot(day, getSlotFromX(e.touches[0].clientX, bar));
    },
    [getSlotFromX, paintSlot],
  );

  // ── Copy / paste ─────────────────────────────────────────────────────────────
  const handleCopyDay = (day: number) => {
    setCopySource(day);
    setPasteTargets(new Set());
  };

  const togglePasteTarget = (day: number) => {
    if (day === copySource) return;
    setPasteTargets((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSelectAllTargets = () => {
    if (copySource === null) return;
    setPasteTargets(new Set([0, 1, 2, 3, 4, 5, 6].filter((d) => d !== copySource)));
  };

  const handlePaste = () => {
    if (copySource === null || !onCopyDay) return;
    pasteTargets.forEach((target) => onCopyDay(copySource, target));
    setCopySource(null);
    setPasteTargets(new Set());
  };

  const cancelCopy = () => {
    setCopySource(null);
    setPasteTargets(new Set());
  };

  // ── Presets ───────────────────────────────────────────────────────────────────
  const handlePresetApply = (pattern: ScheduleMode[]) => {
    onApplyPreset?.([0, 1, 2, 3, 4, 5, 6], pattern);
  };

  // ── Tooltip label for hovered slot ────────────────────────────────────────────
  const slotToTime = (slot: number) => {
    const h = Math.floor(slot / 2).toString().padStart(2, '0');
    const m = slot % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  };

  return (
    <div className="space-y-4">

      {/* ── Brush selector ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500 shrink-0">Mode à peindre :</span>
        <div className="flex gap-2">
          {(['cft', 'eco', 'fro'] as ScheduleMode[]).map((mode) => {
            const { label, bar, ring } = MODE_META[mode];
            const active = brushMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setBrushMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? `${bar} text-white border-transparent ring-2 ring-offset-1 ${ring}`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? 'bg-white/80' : bar}`} />
                {label}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-gray-400 italic hidden sm:inline">
          Cliquez ou faites glisser sur une journée pour peindre
        </span>
      </div>

      {/* ── Presets ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
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
        <span className="text-[10px] text-gray-400 italic">Applique à toute la semaine</span>
      </div>

      {/* ── Copy / paste panel ──────────────────────────────────────────────── */}
      {copySource !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-blue-700">
              📋 Copier <strong>{DAY_LABELS[copySource]}</strong> vers :
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, d) =>
                d === copySource ? null : (
                  <button
                    key={d}
                    onClick={() => togglePasteTarget(d)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      pasteTargets.has(d)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSelectAllTargets}
              className="px-3 py-1 rounded-lg bg-white text-blue-600 border border-blue-300 text-xs font-medium hover:bg-blue-50 transition-colors"
            >
              Tout sélectionner
            </button>
            <button
              onClick={handlePaste}
              disabled={pasteTargets.size === 0}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Coller ({pasteTargets.size} jour{pasteTargets.size > 1 ? 's' : ''})
            </button>
            <button
              onClick={cancelCopy}
              className="px-3 py-1 rounded-lg bg-white text-gray-500 border border-gray-200 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      <div>
        {/* Hour axis */}
        <div className="relative h-5 ml-14 mr-14">
          {AXIS_HOURS.map((h) => (
            <span
              key={h}
              className="absolute text-[10px] text-gray-400 -translate-x-1/2"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {h === 0 || h === 24 ? `${h}h` : `${h}h`}
            </span>
          ))}
        </div>

        {/* Day rows */}
        <div className="space-y-1">
          {DAY_LABELS.map((label, day) => {
            const isToday       = day === currentDay;
            const isCopySource  = copySource === day;
            const isPasteTarget = pasteTargets.has(day);

            return (
              <div
                key={day}
                className={`flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors group ${
                  isCopySource  ? 'bg-blue-50' :
                  isPasteTarget ? 'bg-blue-50/60' : ''
                }`}
              >
                {/* Day label */}
                <div className={`w-12 shrink-0 text-right text-xs font-semibold leading-none ${
                  isToday ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {label}
                  {isToday && (
                    <span className="block w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto mt-0.5" />
                  )}
                </div>

                {/* Timeline bar */}
                <div
                  ref={(el) => { barRefs.current[day] = el; }}
                  className={`relative flex-1 h-8 rounded-md overflow-hidden cursor-crosshair select-none transition-shadow ${
                    isCopySource  ? 'ring-2 ring-blue-400 ring-offset-1' :
                    isPasteTarget ? 'ring-2 ring-blue-300 ring-offset-1' : ''
                  }`}
                  onMouseDown={(e) => handleBarMouseDown(day, e)}
                  onMouseMove={(e) => {
                    const bar = barRefs.current[day];
                    if (bar) setHoveredSlot({ day, slot: getSlotFromX(e.clientX, bar) });
                  }}
                  onMouseLeave={() => setHoveredSlot(null)}
                  onTouchStart={(e) => handleBarTouchStart(day, e)}
                  onTouchMove={(e) => handleBarTouchMove(day, e)}
                >
                  {/* Mode segments */}
                  <div className="absolute inset-0 flex">
                    {schedule[day].map((mode, slot) => (
                      <div
                        key={slot}
                        className={`flex-1 ${MODE_META[mode].bar}`}
                      />
                    ))}
                  </div>

                  {/* 3h grid lines */}
                  {[3, 6, 9, 12, 15, 18, 21].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {/* Current-time indicator */}
                  {isToday && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow z-10 pointer-events-none"
                      style={{ left: `${currentTimePct}%` }}
                    />
                  )}

                  {/* Hover time tooltip */}
                  {hoveredSlot?.day === day && (
                    <div
                      className="absolute top-0 bottom-0 flex items-center pointer-events-none z-20"
                      style={{ left: `${(hoveredSlot.slot / 48) * 100}%` }}
                    >
                      <div className="absolute -top-0.5 left-1 bg-gray-800 text-white text-[9px] px-1 py-0.5 rounded whitespace-nowrap">
                        {slotToTime(hoveredSlot.slot)}
                      </div>
                      <div className="w-px h-full bg-white/60" />
                    </div>
                  )}
                </div>

                {/* Per-row actions (visible on hover) */}
                <div className="flex gap-1 shrink-0 w-12 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyDay(day)}
                    title="Copier ce jour"
                    className={`text-xs px-1.5 py-1 rounded transition-colors ${
                      isCopySource
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    ⎘
                  </button>
                  <button
                    onClick={() => onFillDay?.(day, 'eco')}
                    title="Réinitialiser en Éco"
                    className="text-xs px-1.5 py-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-gray-600">
        {(['cft', 'eco', 'fro'] as ScheduleMode[]).map((mode) => (
          <span key={mode} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm inline-block ${MODE_META[mode].bar}`} />
            {MODE_META[mode].label}
          </span>
        ))}
        <span className="text-gray-400 italic">⎘ copier un jour · ✕ réinitialiser en Éco</span>
      </div>
    </div>
  );
}
