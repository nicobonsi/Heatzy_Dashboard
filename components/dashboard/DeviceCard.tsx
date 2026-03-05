'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Device, HeatzyMode, ProductType, getProductType } from '@/types';
import { StatusBadge } from '@/components/device/StatusBadge';
import { PiloteProPanel } from '@/components/device/PiloteProPanel';
import { PilotePanel } from '@/components/device/PilotePanel';
import { DeviceNameEditor } from '@/components/device/DeviceNameEditor';
import { ScheduleModal } from '@/components/schedule/ScheduleModal';
import { useDeviceStatus, DeviceStatusUpdate } from '@/hooks/useDeviceStatus';
import {
  ActivePlan,
  loadActivePlan,
  saveActivePlan,
  loadStoredSchedule,
} from '@/lib/scheduleStorage';
import { encodeWeekSchedule } from '@/lib/schedule';
import { api } from '@/lib/api/client';
import { useToast } from '@/contexts/ToastContext';


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

/** Reconcile stored active plan with device's reported timerSwitch on mount. */
function initActivePlan(did: string, timerSwitch: 0 | 1 | undefined): ActivePlan {
  if (typeof window === 'undefined') return 'none';
  const stored = loadActivePlan(did);
  if (timerSwitch === 0) return 'none';                    // device says off → always none
  if (timerSwitch === 1 && stored === 'none') return 'primary'; // device on, nothing stored → assume primary
  return stored;
}

export function DeviceCard({ device, refreshKey, onModeUpdate, onNameUpdate, onOnlineUpdate }: Props) {
  const productType = getProductType(device);
  const badge = PRODUCT_BADGE[productType];

  // ── Mode state ────────────────────────────────────────────────────────────
  const [pendingMode, setPendingMode] = useState<HeatzyMode | null>(null);
  const [localMode, setLocalMode]     = useState<HeatzyMode | null>(null);
  const preSentModeRef                = useRef<HeatzyMode | null>(null);
  const suppressExpiryRef             = useRef<number>(0);
  const wsConfirmedModeRef            = useRef<HeatzyMode | null>(null);
  const wsConfirmWindowRef            = useRef<number>(0);

  // ── Active plan state (replaces single localTimerSwitch) ─────────────────
  // 'none'    → schedule off
  // 'primary' → Planning is active on device
  // 'alt'     → Planning Alternatif is active on device
  const [activePlan, setActivePlanState] = useState<ActivePlan>(() =>
    initActivePlan(device.did, device.timerSwitch)
  );
  const activePlanRef              = useRef(activePlan);
  activePlanRef.current            = activePlan;
  const preSentTimerSwitchRef      = useRef<0 | 1 | null>(null);
  const timerSuppressExpiryRef     = useRef<number>(0);

  const setActivePlan = useCallback((next: ActivePlan) => {
    setActivePlanState(next);
    saveActivePlan(device.did, next);
  }, [device.did]);

  // ── Online + schedule modal ───────────────────────────────────────────────
  const [isOnline, setIsOnline]         = useState(device.isOnline);
  const [showSchedule, setShowSchedule] = useState<null | 'primary' | 'alt'>(null);
  const { showToast } = useToast();

  const displayMode = pendingMode ?? localMode ?? device.currentMode;
  const displayModeRef = useRef(displayMode);
  displayModeRef.current = displayMode;

  // Clear overrides when parent refreshes
  useEffect(() => {
    setLocalMode(null);
    preSentModeRef.current        = null;
    suppressExpiryRef.current     = 0;
    wsConfirmedModeRef.current    = null;
    wsConfirmWindowRef.current    = 0;
    preSentTimerSwitchRef.current = null;
    timerSuppressExpiryRef.current = 0;
    setActivePlanState(loadActivePlan(device.did));
  }, [refreshKey, device.did]);

  const handleStatusUpdate = useCallback(
    ({ mode, isOnline: online, timerSwitch, _source }: DeviceStatusUpdate) => {
      if (online !== undefined) {
        setIsOnline(online);
        onOnlineUpdate?.(device.did, online);
      }

      if (_source === 'ws') {
        wsConfirmedModeRef.current = mode;
        wsConfirmWindowRef.current = Date.now() + 90_000;
        // WS push: reconcile activePlan with device's timerSwitch
        if (timerSwitch !== undefined) {
          if (timerSwitch === 0) {
            setActivePlan('none');
          } else if (timerSwitch === 1 && activePlanRef.current === 'none') {
            setActivePlan('primary');
          }
        }
      } else {
        // Poll: apply timerSwitch suppress before early-returns
        if (timerSwitch !== undefined) {
          const timerSuppressed =
            preSentTimerSwitchRef.current !== null &&
            Date.now() < timerSuppressExpiryRef.current &&
            timerSwitch === preSentTimerSwitchRef.current;
          if (!timerSuppressed) {
            if (timerSwitch === 0) {
              setActivePlan('none');
            } else if (timerSwitch === 1 && activePlanRef.current === 'none') {
              setActivePlan('primary');
            }
          }
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
    [device.did, onModeUpdate, onOnlineUpdate, setActivePlan]
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

  /** Toggle a schedule plan on/off (radio-style: only one active at a time). */
  const handleScheduleToggle = useCallback(async (which: 'primary' | 'alt') => {
    if (activePlan === which) {
      // ── Deactivate ──
      preSentTimerSwitchRef.current = 1;
      timerSuppressExpiryRef.current = Date.now() + 90_000;
      setActivePlan('none');
      try {
        await api.controlDevice(device.did, { attrs: { timer_switch: 0 } });
      } catch {
        showToast('error', `Erreur lors de la désactivation du planning pour ${device.name}`);
        preSentTimerSwitchRef.current = null;
        timerSuppressExpiryRef.current = 0;
      }
      return;
    }

    // ── Activate ──
    // For alt: require that it has been saved at least once
    const stored = loadStoredSchedule(device.did, which);
    if (!stored && which === 'alt') {
      showToast('info', `Créez d'abord votre Planning Alternatif en cliquant sur le bouton 📅`);
      return;
    }

    preSentTimerSwitchRef.current = activePlan !== 'none' ? 1 : 0;
    timerSuppressExpiryRef.current = Date.now() + 90_000;
    setActivePlan(which);

    try {
      // Upload the schedule bytes + enable timer
      const attrs: Record<string, unknown> = stored
        ? { ...encodeWeekSchedule(stored), timer_switch: 1 }
        : { timer_switch: 1 }; // primary with no cache: bytes already on device
      await api.controlDevice(device.did, { attrs });
    } catch {
      showToast('error', `Erreur lors de l'activation du planning pour ${device.name}`);
      preSentTimerSwitchRef.current = null;
      timerSuppressExpiryRef.current = 0;
    }
  }, [activePlan, device.did, device.name, setActivePlan, showToast]);

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
          {device.proAttrs?.cur_temp !== undefined && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              🌡 {(device.proAttrs.cur_temp / 10).toFixed(1)} °C
            </span>
          )}
          {device.proAttrs?.cur_humi !== undefined && (
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
              💧 {device.proAttrs.cur_humi} %
            </span>
          )}
        </div>

        {/* Controls */}
        {productType === 'pilote' ? (
          <PilotePanel
            device={device}
            pendingMode={pendingMode}
            onModeChange={handleModeChange}
          />
        ) : (
          <PiloteProPanel
            device={device}
            pendingMode={pendingMode}
            onModeChange={handleModeChange}
            productType={productType}
          />
        )}

        {/* Schedule rows — grid keeps labels and toggles column-aligned */}
        <div className="pt-1 border-t border-gray-100">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-px">
            {(['primary', 'alt'] as const).flatMap((which) => [
              <button
                key={`label-${which}`}
                onClick={() => setShowSchedule(which)}
                className="text-left text-xs py-1.5 text-gray-500 hover:text-blue-600 transition-colors truncate"
              >
                📅{' '}
                <span className="font-medium">
                  {which === 'primary' ? 'Planning' : 'Planning alternatif'}
                </span>
                {activePlan === which && displayMode && (
                  <span className="ml-1 text-blue-600">
                    · {MODE_LABEL[displayMode] ?? displayMode}
                  </span>
                )}
              </button>,
              <div key={`toggle-${which}`} className="flex justify-end">
                <ToggleSwitch
                  checked={activePlan === which}
                  onChange={() => handleScheduleToggle(which)}
                />
              </div>,
            ])}
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleModal
          did={device.did}
          deviceName={device.name}
          which={showSchedule}
          onClose={() => setShowSchedule(null)}
        />
      )}
    </>
  );
}
