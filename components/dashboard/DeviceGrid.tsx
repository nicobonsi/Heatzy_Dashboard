'use client';

import { Device, HeatzyMode } from '@/types';
import { DeviceCard } from './DeviceCard';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  devices: Device[];
  loading: boolean;
  error: string | null;
  onModeUpdate: (did: string, mode: HeatzyMode) => void;
  onNameUpdate: (did: string, name: string) => void;
}

export function DeviceGrid({ devices, loading, error, onModeUpdate, onNameUpdate }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-500">
        <Spinner />
        <span>Chargement des appareils…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600 bg-red-50 rounded-xl">
        <p className="font-medium">Erreur de chargement</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🌡</p>
        <p className="font-medium text-gray-600">Aucun appareil associé</p>
        <p className="text-sm mt-1">Associez vos appareils depuis l'application Heatzy</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {devices.map((device) => (
        <DeviceCard
          key={device.did}
          device={device}
          onModeUpdate={onModeUpdate}
          onNameUpdate={onNameUpdate}
        />
      ))}
    </div>
  );
}
