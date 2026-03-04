'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Device, HeatzyMode, ProductType, getProductType } from '@/types';
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

const PRODUCT_BADGE: Record<ProductType, { bg: string; text: string; label: string }> = {
  'pilote':     { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Heatzy Pilote' },
  'pilote-pro': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: '⭐ Pilote Pro' },
  'glow':       { bg: 'bg-amber-100',  text: 'text-amber-700',  label: '✦ Heatzy Glow' },
  'shine':      { bg: 'bg-sky-100',    text: 'text-sky-700',    label: '✦ Heatzy Shine' },
};

const CARD_BORDER: Record<ProductType, string> = {
  'pilote':     'border-gray-200',
  'pilote-pro': 'border-indigo-200',
  'glow':       'border-amber-200',
  'shine':      'border-sky-200',
};

const MODE_LABEL: Record<string, string> = {
  cft: 'Confort', eco: 'Éco', fro: 'Hors Gel',
  cft1: 'Confort -1', cft2: 'Confort -2', stop: 'Arrêt',
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function DeviceCard({ device, refreshKey, onModeUpdate, onNameUpdate, onOnlineUpdate }: Props) {
  const productType = getProductType(device);
  const pro = productType === 'pilote-pro';
  const badge = PRODUCT_BADGE[productType];

  // ── Mode state ────────────────────────────────────────────────────────────
  const [pendingMode, setPendingMode] = useState<HeatzyMode | null>(null);
  const [localMode, setLocalMode]     = useState<HeatzyMode | null>(null);
  const preSentModeRef                = useRef<HeatzyMode | null>(null);
  const suppressExpiryRef             = useRef<number>(0);
  const wsConfirmedModeRef            = useRef<HeatzyMode | null>(null);
  const wsConfirmWindowRef            = useRef<number>(0);

  // ── Timer switch state ────────────────────────────────────────────────────
  const [localTimerSwitch, setLocalTimerSwitch] = useState<0 | 1 | undefined>(device.timerSwitch);
  const preSentTimerSwitchRef  = useRef<0 | 1 | null>(null);
  const timerSuppressExpiryRef = useRef<number>(0);

  // ── Online + schedule modal ───────────────────────────────────────────────
  const [isOnline, setIsOnline]       = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState(false);
  const { showToast } = useToast();

  const displayMode = pendingMode ?? localMode ?? device.currentMode;
  const displayModeRef = useRef(displayMode);
  displayModeRef.current = displayMode;

  // Clear overrides when parent refreshes
  useEffect(() => {
    setLocalMode(null);
    preSentModeRef.current   = null;
    suppressExpiryRef.current  = 0;
    wsConfirmedModeRef.current = null;
    wsConfirmWindowRef.current = 0;
  }, [refreshKey]);

  const handleStatusUpdate = useCallback(
    ({ mode, isOnline: online, timerSwitch, _source }: DeviceStatusUpdate) => {
      if (online !== undefined) {
        setIsOnline(online);
        onOnlineUpdate?.(device.did, online);
      }

      if (_source === 'ws') {
        wsConfirmedModeRef.current = mode;
        wsConfirmWindowRef.current = Date.now() + 90_000;
        if (timerSwitch !== undefined) setLocalTimerSwitch(timerSwitch);
      } else {
        // Update timerSwitch from poll with its own suppress (before mode early-returns)
        if (timerSwitch !== undefined) {
          const timerSuppressed =
            preSentTimerSwitchRef.current !== null &&
            Date.now() < timerSuppressExpiryRef.current &&
            timerSwitch === preSentTimerSwitchRef.current;
          if (!timerSuppressed) setLocalTimerSwitch(timerSwitch);
        }

        // WS-confirmation suppress for mode
        if (wsConfirmedModeRef.current !== null && Date.now() < wsConfirmWindowRef.current) {
          if (mode !== wsConfirmedModeRef.current) return;
        }
        // GUI-command suppress for mode
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
    preSentModeRef.current = displayModeRef.current;
    suppressExpiryRef.current = Date.now() + 90_000;
    setPendingMode(mode);
    try {
      await api.controlDevice(device.did, { attrs: { mode } });
      setLocalMode(mode);
      onModeUpdate(device.did, mode);
    } catch {
      showToast('error', `Erreur de changement de mode pour ${device.name}`);
      preSentModeRef.current = null;
      suppressExpiryRef.current = 0;
    } finally {
      setPendingMode(null);
    }
  }, [device.did, device.name, isOnline, onModeUpdate, showToast]);

  const handleTimerToggle = useCallback(async () => {
    const newValue: 0 | 1 = localTimerSwitch === 1 ? 0 : 1;
    preSentTimerSwitchRef.current = localTimerSwitch ?? 0;
    timerSuppressExpiryRef.current = Date.now() + 90_000;
    setLocalTimerSwitch(newValue);
    try {
      await api.controlDevice(device.did, { attrs: { timer_switch: newValue } });
    } catch {
      showToast('error', `Erreur de modification du planning pour ${device.name}`);
      preSentTimerSwitchRef.current = null;
      timerSuppressExpiryRef.current = 0;
      setLocalTimerSwitch(localTimerSwitch);
    }
  }, [device.did, device.name, localTimerSwitch, showToast]);

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 ${CARD_BORDER[productType]}`}>
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
          <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
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

        {/* Schedule row */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSchedule(true)}
            className="text-gray-500 hover:text-blue-600 flex-1 justify-start"
          >
            📅 Planning
            {localTimerSwitch === 1 && displayMode && (
              <span className="ml-1 text-blue-600 font-medium">
                · {MODE_LABEL[displayMode] ?? displayMode}
              </span>
            )}
          </Button>
          <ToggleSwitch
            checked={localTimerSwitch === 1}
            onChange={handleTimerToggle}
          />
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
