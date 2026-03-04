'use client';

import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScheduleGrid } from './ScheduleGrid';
import { useSchedule } from '@/hooks/useSchedule';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';
import { ScheduleMode } from '@/types';

interface Props {
  did: string;
  deviceName: string;
  onClose: () => void;
}

export function ScheduleModal({ did, deviceName, onClose }: Props) {
  const { schedule, loading, saving, loadSchedule, updateCell, fillDay, fillAll, copyDay, saveSchedule } =
    useSchedule(did);
  const { showToast } = useToast();

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSave = async () => {
    try {
      await saveSchedule();
      showToast('success', 'Planning enregistré');
      onClose();
    } catch {
      showToast('error', 'Erreur lors de l\'enregistrement du planning');
    }
  };

  return (
    <Modal title={`Planning — ${deviceName}`} onClose={onClose} wide>
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
          />
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Enregistrer le planning
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
