'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleTimeline } from './ScheduleTimeline';
import { useSchedule } from '@/hooks/useSchedule';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';

type EditorMode = 'grid' | 'timeline';

const EDITOR_PREF_KEY = 'heatzy-schedule-editor';

function loadEditorPref(): EditorMode {
  if (typeof window === 'undefined') return 'grid';
  return (localStorage.getItem(EDITOR_PREF_KEY) as EditorMode) ?? 'grid';
}

interface Props {
  did: string;
  deviceName: string;
  which?: 'primary' | 'alt';
  onClose: () => void;
}

export function ScheduleModal({ did, deviceName, which = 'primary', onClose }: Props) {
  const { schedule, loading, saving, loadSchedule, updateCell, fillDay, fillAll, copyDay, applyPreset, saveSchedule } =
    useSchedule(did, which);
  const { showToast } = useToast();

  const [editorMode, setEditorMode] = useState<EditorMode>(loadEditorPref);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const switchEditor = (mode: EditorMode) => {
    setEditorMode(mode);
    localStorage.setItem(EDITOR_PREF_KEY, mode);
  };

  const handleSave = async () => {
    try {
      const result = await saveSchedule();
      if (which === 'alt' && !result?.uploadedToDevice) {
        showToast('success', 'Planning alternatif enregistré — activez-le via le bouton sur la carte');
      } else {
        showToast('success', 'Planning enregistré');
      }
      onClose();
    } catch {
      showToast('error', 'Erreur lors de l\'enregistrement du planning');
    }
  };

  const title = which === 'alt'
    ? `Planning alternatif — ${deviceName}`
    : `Planning — ${deviceName}`;

  return (
    <Modal title={title} onClose={onClose} wide>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Editor toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
              <button
                onClick={() => switchEditor('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  editorMode === 'grid'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ☰ Grille classique
              </button>
              <button
                onClick={() => switchEditor('timeline')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  editorMode === 'timeline'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ▬ Éditeur visuel
              </button>
            </div>
          </div>

          {/* Editor */}
          {editorMode === 'grid' ? (
            <ScheduleGrid
              schedule={schedule}
              onCellChange={updateCell}
              onFillDay={fillDay}
              onFillAll={fillAll}
              onCopyDay={copyDay}
              onApplyPreset={applyPreset}
            />
          ) : (
            <ScheduleTimeline
              schedule={schedule}
              onCellChange={updateCell}
              onFillDay={fillDay}
              onCopyDay={copyDay}
              onApplyPreset={applyPreset}
            />
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {which === 'alt' ? 'Enregistrer le planning alternatif' : 'Enregistrer le planning'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
