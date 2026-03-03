'use client';

import { useState, useCallback } from 'react';
import { Device, HeatzyMode, isPilotePro } from '@/types';
import { StatusBadge } from '@/components/device/StatusBadge';
import { ModeSelector } from '@/components/device/ModeSelector';
import { PiloteProPanel } from '@/components/device/PiloteProPanel';
import { DeviceNameEditor } from '@/components/device/DeviceNameEditor';
import { ScheduleModal } from '@/components/schedule/ScheduleModal';
import { useDeviceStatus, DeviceStatusUpdate } from '@/hooks/useDeviceStatus';
import { api } from '@/lib/api/client';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';

interface Props {
  device: Device;
  onModeUpdate: (did: string, mode: HeatzyMode) => void;
  onNameUpdate: (did: string, name: string) => void;
  onOnlineUpdate?: (did: string, isOnline: boolean) => void;
}

export function DeviceCard({ device, onModeUpdate, onNameUpdate, onOnlineUpdate }: Props) {
  const [pendingMode, setPendingMode]   = useState<HeatzyMode | null>(null);
  const [isOnline, setIsOnline]         = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState(false);
  const { showToast } = useToast();

  const pro = isPilotePro(device);

  const handleStatusUpdate = useCallback(
    ({ mode, isOnline: online }: DeviceStatusUpdate) => {
      onModeUpdate(device.did, mode);
      setIsOnline(online);
      onOnlineUpdate?.(device.did, online);
    },
    [device.did, onModeUpdate, onOnlineUpdate]
  );

  useDeviceStatus(device.did, handleStatusUpdate, 30000);

  const handleModeChange = useCallback(async (mode: HeatzyMode) => {
    if (!isOnline) {
      showToast('info', `${device.name} est hors ligne — commande mise en file d'attente`);
    }
    setPendingMode(mode);
    try {
      await api.controlDevice(device.did, { attrs: { mode } });
      onModeUpdate(device.did, mode);
    } catch {
      showToast('error', `Erreur de changement de mode pour ${device.name}`);
    } finally {
      setPendingMode(null);
    }
  }, [device.did, device.name, isOnline, onModeUpdate, showToast]);

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 ${
        pro ? 'border-indigo-200' : 'border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <DeviceNameEditor
              did={device.did}
              name={device.name}
              onRenamed={(name) => onNameUpdate(device.did, name)}
            />
            <p className="text-xs text-gray-400 mt-0.5 truncate">{device.mac}</p>
          </div>
          <StatusBadge isOnline={isOnline} />
        </div>

        {/* Product badge + live temp for Pro */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
            pro ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {pro ? '⭐ Pilote Pro' : device.productName}
          </span>
          {pro && device.proAttrs?.cur_temp !== undefined && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              🌡 {(device.proAttrs.cur_temp / 10).toFixed(1)} °C
            </span>
          )}
          {pro && device.proAttrs?.cur_humi !== undefined && (
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
              💧 {device.proAttrs.cur_humi} %
            </span>
          )}
        </div>

        {/* Controls — Pro gets full panel, basic Pilote gets simple mode selector */}
        {pro ? (
          <PiloteProPanel
            device={device}
            pendingMode={pendingMode}
            onModeChange={handleModeChange}
          />
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-1">Mode :</p>
            <ModeSelector
              current={pendingMode ?? device.currentMode}
              onChange={handleModeChange}
              disabled={!!pendingMode}
            />
          </div>
        )}

        {/* Schedule */}
        <div className="pt-1 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSchedule(true)}
            className="text-gray-500 hover:text-blue-600"
          >
            📅 Planning hebdomadaire
          </Button>
        </div>
      </div>

      {showSchedule && (
        <ScheduleModal
          did={device.did}
          deviceName={device.name}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </>
  );
}
