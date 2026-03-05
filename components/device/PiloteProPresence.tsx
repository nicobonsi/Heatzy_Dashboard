'use client';

import { useState } from 'react';
import { DerogationMode } from '@/types';
import { Button } from '@/components/ui/Button';

interface Props {
  derogMode: DerogationMode | undefined;
  derogTime: number | undefined;      // minutes
  onSetPresence: (enabled: boolean, minutes: number) => Promise<void>;
  onSetBoost: (minutes: number) => Promise<void>;
  onSetVacation: (days: number) => Promise<void>;
  onClearDerog: () => Promise<void>;
}

const PRESENCE_DURATION_OPTIONS = [15, 30, 60, 120, 240];
const PRESENCE_LABEL = (m: number) => m >= 60 ? `${m / 60}h` : `${m}m`;
const BOOST_DURATION_OPTIONS = [30, 60, 90, 120];

export function PiloteProPresence({
  derogMode,
  derogTime,
  onSetPresence,
  onSetBoost,
  onSetVacation,
  onClearDerog,
}: Props) {
  const [presenceDuration, setPresenceDuration] = useState(60);
  const [boostDuration, setBoostDuration] = useState(60);
  const [vacationDays, setVacationDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const isPresenceActive = derogMode === DerogationMode.Presence;
  const isBoostActive    = derogMode === DerogationMode.Boost;
  const isVacationActive = derogMode === DerogationMode.Vacation;

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">

      {/* Current derogation status */}
      {derogMode !== undefined && derogMode !== DerogationMode.Off && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm
          ${isPresenceActive ? 'bg-purple-50 border border-purple-200' :
            isBoostActive    ? 'bg-orange-50 border border-orange-200' :
                               'bg-blue-50 border border-blue-200'}`}
        >
          <span className="font-medium">
            {isPresenceActive && '👤 Présence active'}
            {isBoostActive    && '🔥 Boost actif'}
            {isVacationActive && '✈️ Mode vacances'}
            {derogTime !== undefined && ` — ${derogMode === DerogationMode.Vacation ? `${derogTime}j` : `${derogTime}min`}`}
          </span>
          <Button size="sm" variant="ghost" loading={loading} onClick={() => run(onClearDerog)}>
            Désactiver
          </Button>
        </div>
      )}

      {/* --- PIR / Presence detection --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header row: label + active badge + toggle */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-gray-700">👤 Détecteur de présence (PIR)</span>
            {isPresenceActive && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Actif</span>
            )}
          </div>
          <button
            onClick={() => run(() => onSetPresence(!isPresenceActive, presenceDuration))}
            disabled={loading}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              isPresenceActive ? 'bg-purple-500' : 'bg-gray-300'
            } disabled:opacity-50`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isPresenceActive ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Timeout row */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap">
          <span className="text-[10px] text-gray-400 shrink-0">Timeout :</span>
          {PRESENCE_DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setPresenceDuration(m)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                presenceDuration === m
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {PRESENCE_LABEL(m)}
            </button>
          ))}
        </div>

        {/* Description */}
        <p className="px-3 pb-2.5 text-[10px] text-gray-400 leading-snug border-t border-gray-100 pt-1.5">
          Passe en Confort lors d'une détection · reprend le mode planifié après le timeout.
        </p>
      </div>

      {/* --- Boost --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">🔥 Boost Confort</span>
          {isBoostActive && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Actif</span>}
        </div>
        <div className="px-3 py-3 space-y-2">
          <p className="text-xs text-gray-500">
            Force le mode Confort temporairement sans modifier la programmation.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600">Durée :</span>
            {BOOST_DURATION_OPTIONS.map((m) => (
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
          <Button size="sm" loading={loading} onClick={() => run(() => onSetBoost(boostDuration))}
            className="bg-orange-500 hover:bg-orange-600 text-white">
            Lancer le boost
          </Button>
        </div>
      </div>

      {/* --- Vacation --- */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">✈️ Mode vacances</span>
          {isVacationActive && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Actif</span>}
        </div>
        <div className="px-3 py-3 space-y-2">
          <p className="text-xs text-gray-500">
            Maintient le mode Hors-Gel pendant votre absence.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Durée :</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setVacationDays(Math.max(1, vacationDays - 1))}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold">−</button>
              <span className="text-sm font-bold w-12 text-center">{vacationDays}j</span>
              <button onClick={() => setVacationDays(Math.min(255, vacationDays + 1))}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold">+</button>
            </div>
          </div>
          <Button size="sm" loading={loading} onClick={() => run(() => onSetVacation(vacationDays))}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            Activer les vacances
          </Button>
        </div>
      </div>
    </div>
  );
}
