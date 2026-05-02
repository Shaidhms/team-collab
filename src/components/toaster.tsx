'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/avatar';

export type Toast = {
  id: string;
  actor: string;
  message: string;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  durationMs?: number;
};

export function Toaster({ toasts, onDismiss, durationMs = 4000 }: Props) {
  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Team activity"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          durationMs={durationMs}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
  durationMs,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
  durationMs: number;
}) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setTimeout(() => onDismiss(toast.id), durationMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [toast.id, durationMs, onDismiss]);

  return (
    <div className="toast">
      <Avatar name={toast.actor} size="sm" />
      <div>
        <strong>{toast.actor}</strong> {toast.message}
      </div>
    </div>
  );
}

// Hook: append + auto-cleanup state for the Toaster.
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (actor: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, actor, message }].slice(-5));
  };
  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, push, dismiss };
}
