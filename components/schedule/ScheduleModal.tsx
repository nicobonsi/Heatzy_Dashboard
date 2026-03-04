'use client';

import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScheduleGrid } from './ScheduleGrid';
import { useSchedule } from '@/hooks/useSchedule';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';

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

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSave = async () => {
    try {
      const result = await saveSchedule();
      if (which === 'alt' && !result?.uploadedToDevice) {
        showToast('success', 'Planning alternatif sauvegardé — activez-le via le bouton sur la carte');
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
          <ScheduleGrid
            schedule={schedule}
            onCellChange={updateCell}
            onFillDay={fillDay}
            onFillAll={fillAll}
            onCopyDay={copyDay}
            onApplyPreset={applyPreset}
          />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {which === 'alt' ? 'Sauvegarder le planning alternatif' : 'Enregistrer le planning'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
