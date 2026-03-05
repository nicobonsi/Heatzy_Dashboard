'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// TEMPERATURE_SCALE = 10  →  stored value = °C × 10
const SCALE = 10;
const MIN_TEMP = 7;   // °C
const MAX_TEMP = 30;  // °C

function toDisplay(raw: number | undefined): number {
  return raw !== undefined ? raw / SCALE : 0;
}

function toRaw(celsius: number): number {
  return Math.round(celsius * SCALE);
}

interface Props {
  cftTemp: number | undefined;  // raw (×10)
  ecoTemp: number | undefined;  // raw (×10)
  curTemp: number | undefined;  // raw (×10)
  curHumi: number | undefined;  // %
  onSave: (cftTemp: number, ecoTemp: number) => Promise<void>;
}

export function PiloteProTemperature({ cftTemp, ecoTemp, curTemp, curHumi, onSave }: Props) {
  const [cft, setCft] = useState<number>(toDisplay(cftTemp) || 20);
  const [eco, setEco] = useState<number>(toDisplay(ecoTemp) || 16);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(toRaw(cft), toRaw(eco));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Live readings */}
      <div className="flex gap-3">
        {curTemp !== undefined && (
          <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-blue-500 font-medium">Température</p>
            <p className="text-xl font-bold text-blue-700">
              {toDisplay(curTemp).toFixed(1)}<span className="text-sm font-normal">°C</span>
            </p>
          </div>
        )}
        {curHumi !== undefined && (
          <div className="flex-1 bg-teal-50 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-teal-500 font-medium">Humidité</p>
            <p className="text-xl font-bold text-teal-700">
              {curHumi}<span className="text-sm font-normal">%</span>
            </p>
          </div>
        )}
      </div>

      {/* Setpoints */}
      <div className="space-y-2">
        <TemperatureSlider
          label="Consigne Confort"
          color="text-orange-600"
          value={cft}
          min={MIN_TEMP}
          max={MAX_TEMP}
          onChange={setCft}
        />
        <TemperatureSlider
          label="Consigne Éco"
          color="text-emerald-600"
          value={eco}
          min={MIN_TEMP}
          max={cft - 1}
          onChange={setEco}
        />
      </div>

      <Button size="sm" onClick={handleSave} loading={saving} className="w-full">
        Appliquer les consignes
      </Button>
    </div>
  );
}

function TemperatureSlider({
  label,
  color,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-xs font-bold leading-none"
          onClick={() => onChange(Math.max(min, value - 0.5))}
        >−</button>
        <span className={`text-sm font-bold w-10 text-center ${color}`}>
          {value.toFixed(1)}°
        </span>
        <button
          className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-xs font-bold leading-none"
          onClick={() => onChange(Math.min(max, value + 0.5))}
        >+</button>
      </div>
    </div>
  );
}
