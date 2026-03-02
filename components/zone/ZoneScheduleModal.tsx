'use client';

import { useState } from 'react';
import { Zone, ScheduleMode, WeekSchedule } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { api } from '@/lib/api/client';
import { encodeWeekSchedule, createDefaultWeekSchedule } from '@/lib/schedule';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  zone: Zone;
  deviceNames: Record<string, string>;
  onSaved: (schedule: WeekSchedule) => void;
  onClose: () => void;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ZoneScheduleModal({ zone, deviceNames, onSaved, onClose }: Props) {
  const [schedule, setSchedule] = useState<WeekSchedule>(
    zone.schedule ?? createDefaultWeekSchedule()
  );
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const updateCell = (day: number, hour: number, mode: ScheduleMode) => {
    setSchedule((prev) => {
      const next = prev.map((d) => [...d]) as WeekSchedule;
      next[day][hour] = mode;
      return next;
    });
  };

  const fillDay = (day: number, mode: ScheduleMode) => {
    setSchedule((prev) => {
      const next = prev.map((d) => [...d]) as WeekSchedule;
      next[day] = new Array(24).fill(mode);
      return next;
    });
  };

  const fillAll = (mode: ScheduleMode) => {
    setSchedule(Array.from({ length: 7 }, () => new Array(24).fill(mode)));
  };

  const handleSave = async () => {
    setSaving(true);
    const encoded = encodeWeekSchedule(schedule);
    let success = 0;
    let failed = 0;

    for (const did of zone.deviceIds) {
      try {
        await api.controlDevice(did, { attrs: encoded });
        success++;
      } catch {
        failed++;
      }
      await delay(200); // avoid rate limiting
    }

    setSaving(false);
    onSaved(schedule);

    if (failed === 0) {
      showToast('success', `Planning appliqué à ${success} appareil${success > 1 ? 's' : ''}`);
    } else {
      showToast(
        'info',
        `Planning appliqué à ${success} appareil${success > 1 ? 's' : ''}, ${failed} échec${failed > 1 ? 's' : ''}`
      );
    }
    onClose();
  };

  return (
    <Modal title={`Planning de la zone — ${zone.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        {zone.deviceIds.length > 0 && (
          <p className="text-sm text-gray-500">
            Ce planning sera appliqué à :{' '}
            <span className="font-medium text-gray-800">
              {zone.deviceIds
                .map((id) => deviceNames[id] ?? id)
                .join(', ')}
            </span>
          </p>
        )}
        <ScheduleGrid
          schedule={schedule}
          onCellChange={updateCell}
          onFillDay={fillDay}
          onFillAll={fillAll}
        />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Appliquer à la zone
          </Button>
        </div>
      </div>
    </Modal>
  );
}
