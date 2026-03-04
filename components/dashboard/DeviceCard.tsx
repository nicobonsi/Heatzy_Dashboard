'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  refreshKey: number;
  onModeUpdate: (did: string, mode: HeatzyMode) => void;
  onNameUpdate: (did: string, name: string) => void;
  onOnlineUpdate?: (did: string, isOnline: boolean) => void;
}

export function DeviceCard({ device, refreshKey, onModeUpdate, onNameUpdate, onOnlineUpdate }: Props) {
  // In-flight optimistic mode (while API call is pending)
  const [pendingMode, setPendingMode] = useState<HeatzyMode | null>(null);
  // Last mode we confirmed sending — overrides stale poll data
  const [localMode, setLocalMode]     = useState<HeatzyMode | null>(null);
  // The mode that was showing just before we sent a command.
  // Any update returning this exact value within the suppress window is ignored (stale API echo).
  // Updates returning a different value are accepted; the suppress stays active until it expires
  // so that subsequent stale polls of the old mode don't overwrite the new state.
  // GUI-command suppress: ignore polls echoing the pre-command mode (GizWits cloud lag)
  const preSentModeRef                = useRef<HeatzyMode | null>(null);
  const suppressExpiryRef             = useRef<number>(0);
  // WS-confirmation suppress: after any WebSocket push, ignore polls that contradict it
  const wsConfirmedModeRef            = useRef<HeatzyMode | null>(null);
  const wsConfirmWindowRef            = useRef<number>(0);
  const [isOnline, setIsOnline]       = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState(false);
  const { showToast } = useToast();

  const pro = isPilotePro(device);

  // Priority: pending (API in-flight) → local (sent + not yet confirmed) → polled
  const displayMode = pendingMode ?? localMode ?? device.currentMode;

  // Keep a ref so handleModeChange can read the current displayMode without a stale closure
  const displayModeRef = useRef(displayMode);
  displayModeRef.current = displayMode;

  // When Actualiser fires, the parent increments refreshKey.
  // Clear all local overrides so the fresh device.currentMode shows through.
  useEffect(() => {
    setLocalMode(null);
    preSentModeRef.current   = null;
    suppressExpiryRef.current  = 0;
    wsConfirmedModeRef.current = null;
    wsConfirmWindowRef.current = 0;
  }, [refreshKey]);

  const handleStatusUpdate = useCallback(
    ({ mode, isOnline: online, _source }: DeviceStatusUpdate) => {
      // Only update online status if the API actually returned the field
      if (online !== undefined) {
        setIsOnline(online);
        onOnlineUpdate?.(device.did, online);
      }

      if (_source === 'ws') {
        // WebSocket push = real-time truth from the device. Always accept it.
        // Open a suppress window so stale polls arriving in the next 90 s can't
        // overwrite this confirmed state (GizWits cloud can lag by minutes).
        wsConfirmedModeRef.current = mode;
        wsConfirmWindowRef.current = Date.now() + 90_000;
      } else {
        // Poll — may be stale. Apply two-layer suppression:

        // 1. WS-confirmation suppress: a recent WS push told us the real mode;
        //    ignore any poll that contradicts it.
        if (wsConfirmedModeRef.current !== null && Date.now() < wsConfirmWindowRef.current) {
          if (mode !== wsConfirmedModeRef.current) return;
        }

        // 2. GUI-command suppress: we sent a command; ignore polls echoing the
        //    old pre-command mode until the cloud catches up.
        if (preSentModeRef.current !== null && Date.now() < suppressExpiryRef.current) {
          if (mode === preSentModeRef.current) return;
        }
      }

      setLocalMode(null);
      onModeUpdate(device.did, mode);
    },
    [device.did, onModeUpdate, onOnlineUpdate]
  );

  useDeviceStatus(device.did, handleStatusUpdate, 10_000);

  const handleModeChange = useCallback(async (mode: HeatzyMode) => {
    if (!isOnline) {
      showToast('info', `${device.name} est hors ligne — commande mise en file d'attente`);
    }
    // Record the current displayed mode so we can suppress its stale echo from the API.
    // 90 s covers worst-case GizWits cloud lag; Actualiser also clears it.
    preSentModeRef.current = displayModeRef.current;
    suppressExpiryRef.current = Date.now() + 90_000;
    setPendingMode(mode);
    try {
      await api.controlDevice(device.did, { attrs: { mode } });
      // Show the sent mode until the API confirms it (or the user refreshes)
      setLocalMode(mode);
      onModeUpdate(device.did, mode);
    } catch {
      showToast('error', `Erreur de changement de mode pour ${device.name}`);
      // Command failed — clear suppress so polls reflect the real device state
      preSentModeRef.current = null;
      suppressExpiryRef.current = 0;
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
