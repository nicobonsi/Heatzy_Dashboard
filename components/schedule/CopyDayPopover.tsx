'use client';

import { useEffect, useRef } from 'react';
import { DAY_LABELS } from '@/lib/schedule';

interface Props {
  sourceDay: number;
  anchorRect: DOMRect;
  onPaste: (target: number) => void;
  onPasteAll: () => void;
  onClose: () => void;
}

export function CopyDayPopover({ sourceDay, anchorRect, onPaste, onPasteAll, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Position below the anchor button, centred on it
  const POPOVER_W = 224;
  const scrollX   = typeof window !== 'undefined' ? window.scrollX : 0;
  const scrollY   = typeof window !== 'undefined' ? window.scrollY : 0;
  const vw        = typeof window !== 'undefined' ? window.innerWidth : 800;

  const rawLeft = anchorRect.left + scrollX + anchorRect.width / 2 - POPOVER_W / 2;
  const top     = anchorRect.bottom + scrollY + 8;
  const left    = Math.max(8, Math.min(rawLeft, vw - POPOVER_W - 8));

  // Arrow offset relative to popover left edge
  const arrowLeft = Math.max(12, Math.min(
    anchorRect.left + scrollX + anchorRect.width / 2 - left - 6,
    POPOVER_W - 24,
  ));

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay so the same click that opened the popover doesn't immediately close it
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('keydown', onKeyDown);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: POPOVER_W, zIndex: 9999 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3"
    >
      {/* Arrow */}
      <div
        className="absolute -top-[7px] w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45 rounded-sm"
        style={{ left: arrowLeft }}
      />

      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Copier <span className="text-blue-600 normal-case">{DAY_LABELS[sourceDay]}</span> vers
      </p>

      {/* Day target buttons — tap to paste immediately */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {DAY_LABELS.map((label, d) =>
          d === sourceDay ? null : (
            <button
              key={d}
              onClick={() => onPaste(d)}
              className="py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-blue-600 hover:text-white active:scale-95 transition-all"
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-2" />

      {/* Paste to all */}
      <button
        onClick={onPasteAll}
        className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        Appliquer à toute la semaine
      </button>
    </div>
  );
}
