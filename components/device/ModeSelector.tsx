'use client';

import { HeatzyMode } from '@/types';

export const MODE_OPTIONS: {
  value: HeatzyMode;
  label: string;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    value: 'stop',
    label: 'Arrêt',
    activeClass: 'bg-gray-700 text-white ring-gray-700',
    inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  },
  {
    value: 'fro',
    label: 'Hors Gel',
    activeClass: 'bg-blue-500 text-white ring-blue-500',
    inactiveClass: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  {
    value: 'eco',
    label: 'Éco',
    activeClass: 'bg-emerald-500 text-white ring-emerald-500',
    inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    value: 'cft2',
    label: 'Confort -2',
    activeClass: 'bg-orange-400 text-white ring-orange-400',
    inactiveClass: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  {
    value: 'cft1',
    label: 'Confort -1',
    activeClass: 'bg-orange-500 text-white ring-orange-500',
    inactiveClass: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  {
    value: 'cft',
    label: 'Confort',
    activeClass: 'bg-red-500 text-white ring-red-500',
    inactiveClass: 'bg-red-50 text-red-700 hover:bg-red-100',
  },
];

interface Props {
  current: HeatzyMode | null;
  onChange: (mode: HeatzyMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ModeSelector({ current, onChange, disabled = false, compact = false }: Props) {
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? '' : 'mt-1'}`}>
      {MODE_OPTIONS.map(({ value, label, activeClass, inactiveClass }) => (
        <button
          key={value}
          disabled={disabled}
          onClick={() => onChange(value)}
          className={`px-2 py-1 rounded text-xs font-medium transition-all focus:outline-none
            ${current === value ? `${activeClass} ring-2 ring-offset-1` : inactiveClass}
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
