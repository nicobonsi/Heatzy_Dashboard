'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { setDeviceNameOverride } from '@/lib/auth';

interface Props {
  did: string;
  name: string;
  onRenamed: (newName: string) => void;
}

export function DeviceNameEditor({ did, name, onRenamed }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      // Try GizWits rename API first; fall back to localStorage on error
      await api.renameDevice(did, trimmed).catch(() => null);
    } finally {
      // Always store locally regardless of API result
      setDeviceNameOverride(did, trimmed);
      onRenamed(trimmed);
      setEditing(false);
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') {
      setValue(name);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="text-base font-semibold text-gray-900 bg-blue-50 border border-blue-300 rounded px-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Cliquer pour renommer"
      className="text-left group"
    >
      <span className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
        {name}
      </span>
      <span className="ml-1 text-gray-300 group-hover:text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        ✏
      </span>
    </button>
  );
}
