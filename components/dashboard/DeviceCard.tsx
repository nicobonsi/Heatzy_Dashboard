'use client';

import { useState, useCallback, useRef } from 'react';
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

// After a manual mode change, suppress poll-driven updates for this long.
// Prevents the 30 s poller from reverting the UI before the device
// has propagated the new state back to the cloud.
const POLL_SUPPRESS_MS = 20_000;

interface Props {
  device: Device;
  onModeUpdate: (did: string, mode: HeatzyMode) => void;
  onNameUpdate: (did: string, name: string) => void;
  onOnlineUpdate?: (did: string, isOnline: boolean) => void;
}

export function DeviceCard({ device, onModeUpdate, onNameUpdate, onOnlineUpdate }: Props) {
  // In-flight optimistic mode (while API call is pending)
  const [pendingMode, setPendingMode] = useState<HeatzyMode | null>(null);
  // Last mode we confirmed sending — displayed for POLL_SUPPRESS_MS to block stale polls
  const [localMode, setLocalMode]     = useState<HeatzyMode | null>(null);
  const localModeSetAt                = useRef<number>(0);
  const [isOnline, setIsOnline]       = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState(false);
  const { showToast } = useToast();

  const pro = isPilotePro(device);

  // Priority: pending (API in-flight) → local (recently confirmed) → polled
  const displayMode = pendingMode ?? localMode ?? device.currentMode;

  const handleStatusUpdate = useCallback(
    ({ mode, isOnline: online }: DeviceStatusUpdate) => {
      setIsOnline(online);
      onOnlineUpdate?.(device.did, online);

      // Only accept the polled mode once the suppress window has elapsed
      if (Date.now() - localModeSetAt.current >= POLL_SUPPRESS_MS) {
        setLocalMode(null);
        onModeUpdate(device.did, mode);
      }
    },
    [device.did, onModeUpdate, onOnlineUpdate]
  );

  useDeviceStatus(device.did, handleStatusUpdate, 30_000);

  const handleModeChange = useCallback(async (mode: HeatzyMode) => {
    if (!isOnline) {
      showToast('info', `${device.name} est hors ligne — commande mise en file d'attente`);
    }
    setPendingMode(mode);
    try {
      await api.controlDevice(device.did, { attrs: { mode } });
      // Lock in the new mode and start the suppress window
      setLocalMode(mode);
      localModeSetAt.current = Date.now();
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

        {/* Product badge + live readings for Pro */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
            pro ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {pro ? '⭐ Pilote Pro' : 'Heatzy Pilote'}
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

        {/* Controls */}
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
              current={displayMode}
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
