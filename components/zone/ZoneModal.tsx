'use client';

import { useState } from 'react';
import { Device, Zone } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ZoneDevicePicker } from './ZoneDevicePicker';

interface CreateProps {
  devices: Device[];
  onSave: (name: string, deviceIds: string[]) => void;
  onClose: () => void;
}

export function ZoneCreateModal({ devices, onSave, onClose }: CreateProps) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const handleSave = () => {
    if (!name.trim() || selected.length === 0) return;
    onSave(name.trim(), selected);
    onClose();
  };

  return (
    <Modal title="Créer une zone" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la zone
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Chambre parentale"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Appareils dans cette zone ({selected.length} sélectionné
            {selected.length > 1 ? 's' : ''})
          </label>
          <ZoneDevicePicker devices={devices} selected={selected} onChange={setSelected} />
        </div>
        {selected.length === 0 && (
          <p className="text-xs text-amber-600">Sélectionnez au moins un appareil</p>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || selected.length === 0}>
            Créer la zone
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface EditProps {
  zone: Zone;
  devices: Device[];
  onSave: (name: string, deviceIds: string[]) => void;
  onClose: () => void;
}

export function ZoneEditModal({ zone, devices, onSave, onClose }: EditProps) {
  const [name, setName] = useState(zone.name);
  const [selected, setSelected] = useState<string[]>(zone.deviceIds);

  const handleSave = () => {
    if (!name.trim() || selected.length === 0) return;
    onSave(name.trim(), selected);
    onClose();
  };

  return (
    <Modal title={`Modifier — ${zone.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la zone
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Appareils ({selected.length} sélectionné{selected.length > 1 ? 's' : ''})
          </label>
          <ZoneDevicePicker devices={devices} selected={selected} onChange={setSelected} />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || selected.length === 0}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
