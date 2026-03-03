'use client';

import { useState, useCallback } from 'react';
import { Device, HeatzyMode, PiloteProControlMode, DerogationMode } from '@/types';
import { ModeSelector } from './ModeSelector';
import { PiloteProTemperature } from './PiloteProTemperature';
import { PiloteProPresence } from './PiloteProPresence';
import { api } from '@/lib/api/client';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  device: Device;
  pendingMode: HeatzyMode | null;
  onModeChange: (mode: HeatzyMode) => Promise<void>;
}

type Tab = 'mode' | 'temperature' | 'presence';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'mode',        label: 'Mode',        icon: '🌡' },
  { id: 'temperature', label: 'Thermostat',   icon: '🎯' },
  { id: 'presence',    label: 'Présence',     icon: '👤' },
];

export function PiloteProPanel({ device, pendingMode, onModeChange }: Props) {
  const [tab, setTab]                         = useState<Tab>('mode');
  const [controlMode, setControlMode]         = useState<PiloteProControlMode>('filpilote');
  const [windowEnabled, setWindowEnabled]     = useState<boolean>(
    device.proAttrs?.window_switch === 1
  );
  const [togglingWindow, setTogglingWindow]   = useState(false);
  const { showToast } = useToast();

  const proAttrs = device.proAttrs ?? {};

  // ── Temperature setpoints ──────────────────────────────────────────────────
  const handleSaveTemps = useCallback(async (cftTemp: number, ecoTemp: number) => {
    await api.controlDevice(device.did, { attrs: { cft_temp: cftTemp, eco_temp: ecoTemp } });
    showToast('success', 'Consignes enregistrées');
  }, [device.did, showToast]);

  // ── Window detection ───────────────────────────────────────────────────────
  const handleToggleWindow = useCallback(async () => {
    const next = windowEnabled ? 0 : 1;
    setTogglingWindow(true);
    try {
      await api.controlDevice(device.did, { attrs: { window_switch: next } });
      setWindowEnabled(next === 1);
      showToast('success', next ? 'Détection fenêtre activée' : 'Détection fenêtre désactivée');
    } catch {
      showToast('error', 'Erreur lors du changement');
    } finally {
      setTogglingWindow(false);
    }
  }, [device.did, windowEnabled, showToast]);

  // ── Derogation helpers ─────────────────────────────────────────────────────
  const sendDerog = useCallback(async (mode: DerogationMode, time: number) => {
    await api.controlDevice(device.did, { attrs: { derog_mode: mode, derog_time: time } });
  }, [device.did]);

  const handleSetPresence = useCallback(async (enabled: boolean, minutes: number) => {
    await sendDerog(enabled ? DerogationMode.Presence : DerogationMode.Off, minutes);
    showToast('success', enabled ? 'Présence activée' : 'Présence désactivée');
  }, [sendDerog, showToast]);

  const handleSetBoost = useCallback(async (minutes: number) => {
    await sendDerog(DerogationMode.Boost, minutes);
    showToast('success', `Boost Confort lancé pour ${minutes} min`);
  }, [sendDerog, showToast]);

  const handleSetVacation = useCallback(async (days: number) => {
    await sendDerog(DerogationMode.Vacation, days);
    showToast('success', `Mode vacances activé pour ${days} jour${days > 1 ? 's' : ''}`);
  }, [sendDerog, showToast]);

  const handleClearDerog = useCallback(async () => {
    await api.controlDevice(device.did, { attrs: { derog_mode: DerogationMode.Off, derog_time: 0 } });
    showToast('success', 'Dérogation annulée');
  }, [device.did, showToast]);

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 font-medium transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Mode tab ── */}
      {tab === 'mode' && (
        <div className="space-y-3">
          {/* Control mode toggle */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500 mr-1">Régulation :</span>
            <button
              onClick={() => setControlMode('filpilote')}
              className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                controlMode === 'filpilote'
                  ? 'bg-white shadow text-gray-800 border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Fil pilote
            </button>
            <button
              onClick={() => setControlMode('thermostat')}
              className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                controlMode === 'thermostat'
                  ? 'bg-white shadow text-gray-800 border border-gray-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Thermostat
            </button>
          </div>

          {controlMode === 'filpilote' ? (
            <>
              <p className="text-xs text-gray-500">
                Envoie directement le signal fil pilote au radiateur.
              </p>
              <ModeSelector
                current={pendingMode ?? device.currentMode}
                onChange={onModeChange}
                disabled={!!pendingMode}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                La sonde interne régule la température vers la consigne du mode actif.
                Activez le mode Confort ou Éco pour déclencher la régulation.
              </p>
              {/* Mode still selects which setpoint is active */}
              <ModeSelector
                current={pendingMode ?? device.currentMode}
                onChange={onModeChange}
                disabled={!!pendingMode}
              />
              {(proAttrs.cft_temp !== undefined || proAttrs.cur_temp !== undefined) && (
                <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 space-y-1">
                  {proAttrs.cur_temp !== undefined && (
                    <p>🌡 Temp. actuelle : <strong>{(proAttrs.cur_temp / 10).toFixed(1)} °C</strong></p>
                  )}
                  {proAttrs.cft_temp !== undefined && (
                    <p>🎯 Consigne Confort : <strong>{(proAttrs.cft_temp / 10).toFixed(1)} °C</strong></p>
                  )}
                  {proAttrs.eco_temp !== undefined && (
                    <p>🎯 Consigne Éco : <strong>{(proAttrs.eco_temp / 10).toFixed(1)} °C</strong></p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Window detection toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-700">🪟 Détection fenêtre ouverte</p>
              <p className="text-xs text-gray-400">Coupe le chauffage si la temp. chute brutalement</p>
            </div>
            <button
              onClick={handleToggleWindow}
              disabled={togglingWindow}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                windowEnabled ? 'bg-emerald-500' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  windowEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ── Thermostat tab ── */}
      {tab === 'temperature' && (
        <PiloteProTemperature
          curTemp={proAttrs.cur_temp}
          curHumi={proAttrs.cur_humi}
          cftTemp={proAttrs.cft_temp}
          ecoTemp={proAttrs.eco_temp}
          onSave={handleSaveTemps}
        />
      )}

      {/* ── Presence tab ── */}
      {tab === 'presence' && (
        <PiloteProPresence
          derogMode={proAttrs.derog_mode}
          derogTime={proAttrs.derog_time}
          onSetPresence={handleSetPresence}
          onSetBoost={handleSetBoost}
          onSetVacation={handleSetVacation}
          onClearDerog={handleClearDerog}
        />
      )}
    </div>
  );
}
