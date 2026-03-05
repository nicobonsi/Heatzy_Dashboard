'use client';

import { useState, useCallback } from 'react';
import { Device, HeatzyMode, DerogationMode } from '@/types';
import { ModeSelector } from './ModeSelector';
import { api } from '@/lib/api/client';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';

interface Props {
  device: Device;
  pendingMode: HeatzyMode | null;
  onModeChange: (mode: HeatzyMode) => Promise<void>;
}

type Tab = 'mode' | 'options';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'mode',    label: 'Mode',    icon: '🌡' },
  { id: 'options', label: 'Options', icon: '⚙️' },
];

const BOOST_OPTIONS = [30, 60, 90, 120];

function ToggleRow({
  label, description, checked, loading, onToggle,
}: {
  label: string; description?: string; checked: boolean; loading: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-emerald-500' : 'bg-gray-300'
        } disabled:opacity-50`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

export function PilotePanel({ device, pendingMode, onModeChange }: Props) {
  const [tab, setTab] = useState<Tab>('mode');
  const proAttrs = device.proAttrs ?? {};

  const [windowEnabled, setWindowEnabled] = useState(proAttrs.window_switch === 1);
  const [lockEnabled, setLockEnabled]     = useState(proAttrs.lock_switch === 1);
  const [togglingWindow, setTogglingWindow] = useState(false);
  const [togglingLock, setTogglingLock]     = useState(false);

  const [boostDuration, setBoostDuration] = useState(60);
  const [vacationDays, setVacationDays]   = useState(7);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const isBoostActive    = proAttrs.derog_mode === DerogationMode.Boost;
  const isVacationActive = proAttrs.derog_mode === DerogationMode.Vacation;
  const derogTime        = proAttrs.derog_time;

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

  const handleToggleLock = useCallback(async () => {
    const next = lockEnabled ? 0 : 1;
    setTogglingLock(true);
    try {
      await api.controlDevice(device.did, { attrs: { lock_switch: next } });
      setLockEnabled(next === 1);
      showToast('success', next ? 'Verrouillage activé' : 'Verrouillage désactivé');
    } catch {
      showToast('error', 'Erreur lors du changement');
    } finally {
      setTogglingLock(false);
    }
  }, [device.did, lockEnabled, showToast]);

  const sendDerog = useCallback(async (mode: DerogationMode, time: number) => {
    setLoading(true);
    try {
      await api.controlDevice(device.did, { attrs: { derog_mode: mode, derog_time: time } });
    } finally {
      setLoading(false);
    }
  }, [device.did]);

  const handleClearDerog = useCallback(async () => {
    await sendDerog(DerogationMode.Off, 0);
    showToast('success', 'Dérogation annulée');
  }, [sendDerog, showToast]);

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
                ? 'bg-gray-700 text-white'
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
          <ModeSelector
            current={pendingMode ?? device.currentMode}
            onChange={onModeChange}
            disabled={!!pendingMode}
          />
          <ToggleRow
            label="🪟 Détection fenêtre ouverte"
            description="Coupe le chauffage si la temp. chute brutalement"
            checked={windowEnabled}
            loading={togglingWindow}
            onToggle={handleToggleWindow}
          />
          <ToggleRow
            label="🔒 Mode Verrouillage"
            description="Empêche toute modification sur le produit physique"
            checked={lockEnabled}
            loading={togglingLock}
            onToggle={handleToggleLock}
          />
        </div>
      )}

      {/* ── Options tab ── */}
      {tab === 'options' && (
        <div className="space-y-3">
          {/* Active derogation banner */}
          {proAttrs.derog_mode !== undefined && proAttrs.derog_mode !== DerogationMode.Off && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
              isBoostActive
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <span className="font-medium">
                {isBoostActive    && `🔥 Boost actif${derogTime ? ` — ${derogTime}min` : ''}`}
                {isVacationActive && `✈️ Vacances actif${derogTime ? ` — ${derogTime}j` : ''}`}
              </span>
              <Button size="sm" variant="ghost" loading={loading} onClick={handleClearDerog}>
                Désactiver
              </Button>
            </div>
          )}

          {/* Boost */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">🔥 Boost Confort</span>
              {isBoostActive && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Actif</span>
              )}
            </div>
            <div className="px-3 py-3 space-y-2">
              <p className="text-xs text-gray-500">
                Force le mode Confort temporairement sans modifier la programmation.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600">Durée :</span>
                {BOOST_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setBoostDuration(m)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      boostDuration === m
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m >= 60 ? `${m / 60}h` : `${m}min`}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                loading={loading}
                onClick={() => {
                  sendDerog(DerogationMode.Boost, boostDuration);
                  showToast('success', `Boost Confort lancé pour ${boostDuration >= 60 ? `${boostDuration / 60}h` : `${boostDuration}min`}`);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Lancer le boost
              </Button>
            </div>
          </div>

          {/* Vacation */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">✈️ Mode vacances</span>
              {isVacationActive && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Actif</span>
              )}
            </div>
            <div className="px-3 py-3 space-y-2">
              <p className="text-xs text-gray-500">
                Maintient le mode Hors-Gel pendant votre absence.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">Durée :</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setVacationDays(Math.max(1, vacationDays - 1))}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold"
                  >−</button>
                  <span className="text-sm font-bold w-12 text-center">{vacationDays}j</span>
                  <button
                    onClick={() => setVacationDays(Math.min(255, vacationDays + 1))}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold"
                  >+</button>
                </div>
              </div>
              <Button
                size="sm"
                loading={loading}
                onClick={() => {
                  sendDerog(DerogationMode.Vacation, vacationDays);
                  showToast('success', `Mode vacances activé pour ${vacationDays} jour${vacationDays > 1 ? 's' : ''}`);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Activer les vacances
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
