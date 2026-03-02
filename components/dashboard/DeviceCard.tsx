'use client';

import { useState, useCallback } from 'react';
import { Device, HeatzyMode } from '@/types';
import { StatusBadge } from '@/components/device/StatusBadge';
import { ModeSelector } from '@/components/device/ModeSelector';
import { DeviceNameEditor } from '@/components/device/DeviceNameEditor';
import { ScheduleModal } from '@/components/schedule/ScheduleModal';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
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
  const [pendingMode, setPendingMode] = useState<HeatzyMode | null>(null);
  const [isOnline, setIsOnline] = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState(false);
  const { showToast } = useToast();

  const handleStatusUpdate = useCallback(
    (mode: HeatzyMode, online: boolean) => {
      onModeUpdate(device.did, mode);
      setIsOnline(online);
      onOnlineUpdate?.(device.did, online);
    },
    [device.did, onModeUpdate, onOnlineUpdate]
  );

  useDeviceStatus(device.did, handleStatusUpdate, 30000);

  const displayMode = pendingMode ?? device.currentMode;

  const handleModeChange = async (mode: HeatzyMode) => {
    if (!isOnline) {
      showToast('info', `${device.name} est hors ligne — commande mise en file d'attente`);
    }
    setPendingMode(mode);
    try {
      await api.controlDevice(device.did, { attrs: { mode } });
      onModeUpdate(device.did, mode);
    } catch {
      showToast('error', `Erreur lors du changement de mode pour ${device.name}`);
      setPendingMode(null);
    } finally {
      setPendingMode(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
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

        {/* Product type */}
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {device.productName}
        </p>

        {/* Mode selector */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Mode :</p>
          <ModeSelector
            current={displayMode}
            onChange={handleModeChange}
            disabled={!!pendingMode}
          />
        </div>

        {/* Actions */}
        <div className="pt-1 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSchedule(true)}
            className="text-gray-500 hover:text-blue-600"
          >
            📅 Planning
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
