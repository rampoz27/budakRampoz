'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { AlarmInput } from '@/lib/supabase/alarms';

interface AlarmModalProps {
  onClose: () => void;
  onSave: (input: AlarmInput) => Promise<void>;
}

function defaultDateTimeLocal(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000); // default: 30 minutes from now
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AlarmModal({ onClose, onSave }: AlarmModalProps) {
  const [label, setLabel] = useState('');
  const [dateTimeLocal, setDateTimeLocal] = useState(defaultDateTimeLocal());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!label.trim()) {
      setError('Kasih label buat alarm ini.');
      return;
    }

    const chosen = new Date(dateTimeLocal);
    if (Number.isNaN(chosen.getTime())) {
      setError('Waktu nggak valid.');
      return;
    }
    if (chosen.getTime() <= Date.now()) {
      setError('Waktunya harus di masa depan.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ label: label.trim(), alarm_time: chosen.toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alarm.');
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New alarm</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="alarm-label">
              Remind me about...
            </label>
            <input
              id="alarm-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Follow up QRIS"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="alarm-time">
              When
            </label>
            <input
              id="alarm-time"
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {isSaving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
              Set alarm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
