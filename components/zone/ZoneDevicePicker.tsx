'use client';

import { Device } from '@/types';

interface Props {
  devices: Device[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function ZoneDevicePicker({ devices, selected, onChange }: Props) {
  const toggle = (did: string) => {
    if (selected.includes(did)) {
      onChange(selected.filter((id) => id !== did));
    } else {
      onChange([...selected, did]);
    }
  };

  if (devices.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        Aucun appareil disponible
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <label
          key={device.did}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            selected.includes(device.did)
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(device.did)}
            onChange={() => toggle(device.did)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{device.name}</p>
            <p className="text-xs text-gray-400 truncate">{device.mac}</p>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              device.isOnline ? 'bg-emerald-400' : 'bg-gray-300'
            }`}
          />
        </label>
      ))}
    </div>
  );
}
