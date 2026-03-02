'use client';

import { useToast } from '@/contexts/ToastContext';
import { ToastMessage } from '@/types';

const STYLES: Record<ToastMessage['type'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

const ICONS: Record<ToastMessage['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm shadow-lg min-w-[280px] max-w-sm ${STYLES[toast.type]}`}
        >
          <span className="font-bold">{ICONS[toast.type]}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
