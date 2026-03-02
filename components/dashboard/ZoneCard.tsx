'use client';

import { useState, useCallback } from 'react';
import { Zone, Device, HeatzyMode } from '@/types';
import { ModeSelector } from '@/components/device/ModeSelector';
import { ZoneScheduleModal } from '@/components/zone/ZoneScheduleModal';
import { ZoneEditModal } from '@/components/zone/ZoneModal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { useToast } from '@/contexts/ToastContext';
import { WeekSchedule } from '@/types';

const DELAY_MS = 200;
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface Props {
  zone: Zone;
  devices: Device[];
  onRename: (id: string, name: string, deviceIds: string[]) => void;
  onDelete: (id: string) => void;
  onScheduleSaved: (id: string, schedule: WeekSchedule) => void;
}

export function ZoneCard({ zone, devices, onRename, onDelete, onScheduleSaved }: Props) {
  const [currentMode, setCurrentMode] = useState<HeatzyMode | null>(null);
  const [applyingMode, setApplyingMode] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const { showToast } = useToast();

  const zoneDevices = devices.filter((d) => zone.deviceIds.includes(d.did));
  const deviceNames: Record<string, string> = {};
  devices.forEach((d) => {
    deviceNames[d.did] = d.name;
  });

  const handleModeChange = useCallback(
    async (mode: HeatzyMode) => {
      setApplyingMode(true);
      setCurrentMode(mode);
      let success = 0;
      let failed = 0;
      for (const did of zone.deviceIds) {
        try {
          await api.controlDevice(did, { attrs: { mode } });
          success++;
        } catch {
          failed++;
        }
        await delay(DELAY_MS);
      }
      setApplyingMode(false);
      if (failed === 0) {
        showToast('success', `Mode appliqué à ${success} appareil${success > 1 ? 's' : ''}`);
      } else {
        showToast('info', `${success} OK, ${failed} échec${failed > 1 ? 's' : ''}`);
      }
    },
    [zone.deviceIds, showToast]
  );

  const handleEditSave = (name: string, deviceIds: string[]) => {
    onRename(zone.id, name, deviceIds);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{zone.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {zoneDevices.length} appareil{zoneDevices.length > 1 ? 's' : ''}
              {zoneDevices.length > 0 && (
                <> · {zoneDevices.map((d) => d.name).join(', ')}</>
              )}
            </p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            Zone
          </span>
        </div>

        {/* Mode selector */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Appliquer à toute la zone :</p>
          <ModeSelector
            current={currentMode}
            onChange={handleModeChange}
            disabled={applyingMode || zone.deviceIds.length === 0}
          />
          {applyingMode && (
            <p className="text-xs text-blue-500 mt-1">Application en cours…</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={() => setShowSchedule(true)}>
            📅 Planning
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>
            ✏ Modifier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Supprimer la zone "${zone.name}" ?`)) onDelete(zone.id);
            }}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            🗑 Supprimer
          </Button>
        </div>
      </div>

      {showSchedule && (
        <ZoneScheduleModal
          zone={zone}
          deviceNames={deviceNames}
          onSaved={(schedule) => onScheduleSaved(zone.id, schedule)}
          onClose={() => setShowSchedule(false)}
        />
      )}
      {showEdit && (
        <ZoneEditModal
          zone={zone}
          devices={devices}
          onSave={handleEditSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
