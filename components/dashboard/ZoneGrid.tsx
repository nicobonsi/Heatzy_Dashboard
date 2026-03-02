'use client';

import { useState } from 'react';
import { Zone, Device, WeekSchedule } from '@/types';
import { ZoneCard } from './ZoneCard';
import { ZoneCreateModal } from '@/components/zone/ZoneModal';
import { Button } from '@/components/ui/Button';

interface Props {
  zones: Zone[];
  devices: Device[];
  onAddZone: (name: string, deviceIds: string[]) => void;
  onRenameZone: (id: string, name: string) => void;
  onUpdateZoneDevices: (id: string, deviceIds: string[]) => void;
  onDeleteZone: (id: string) => void;
  onSaveZoneSchedule: (id: string, schedule: WeekSchedule) => void;
}

export function ZoneGrid({
  zones,
  devices,
  onAddZone,
  onRenameZone,
  onUpdateZoneDevices,
  onDeleteZone,
  onSaveZoneSchedule,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const handleRename = (id: string, name: string, deviceIds: string[]) => {
    onRenameZone(id, name);
    onUpdateZoneDevices(id, deviceIds);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Zones</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + Créer une zone
        </Button>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-3xl mb-2">🏠</p>
          <p className="font-medium text-gray-600">Aucune zone créée</p>
          <p className="text-sm mt-1">
            Groupez plusieurs appareils pour les contrôler ensemble
          </p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
            Créer ma première zone
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              devices={devices}
              onRename={handleRename}
              onDelete={onDeleteZone}
              onScheduleSaved={onSaveZoneSchedule}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <ZoneCreateModal
          devices={devices}
          onSave={onAddZone}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
