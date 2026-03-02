'use client';

import { ScheduleMode } from '@/types';

const CELL_COLORS: Record<ScheduleMode, string> = {
  cft: 'bg-orange-400 hover:bg-orange-500',
  eco: 'bg-emerald-400 hover:bg-emerald-500',
  fro: 'bg-blue-300 hover:bg-blue-400',
};

interface Props {
  mode: ScheduleMode;
  onClick: () => void;
  small?: boolean;
}

export function ScheduleCell({ mode, onClick, small = false }: Props) {
  return (
    <button
      onClick={onClick}
      title={mode === 'cft' ? 'Confort' : mode === 'eco' ? 'Éco' : 'Hors Gel'}
      className={`w-full transition-colors cursor-pointer rounded-sm ${CELL_COLORS[mode]} ${small ? 'h-4' : 'h-6'}`}
    />
  );
}
