'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { ShiftTemplateRow, ShiftTemplateInput } from '@/lib/shifts';

interface ShiftTemplateModalProps {
  template: ShiftTemplateRow | null; // null = creating new
  onClose: () => void;
  onSave: (input: ShiftTemplateInput) => Promise<void>;
}

export default function ShiftTemplateModal({ template, onClose, onSave }: ShiftTemplateModalProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [jobdesks, setJobdesks] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setStartTime(template.start_time || '');
      setEndTime(template.end_time || '');
      setJobdesks(template.jobdesks.length > 0 ? template.jobdesks : ['']);
    }
  }, [template]);

  function updateJobdesk(index: number, value: string) {
    setJobdesks((prev) => prev.map((j, i) => (i === index ? value : j)));
  }

  function addJobdeskRow() {
    setJobdesks((prev) => [...prev, '']);
  }

  function removeJobdeskRow(index: number) {
    setJobdesks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Shift name is required.');
      return;
    }
    const cleanedJobdesks = jobdesks.map((j) => j.trim()).filter(Boolean);
    if (cleanedJobdesks.length === 0) {
      setError('Add at least one jobdesk item.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        jobdesks: cleanedJobdesks,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shift template.');
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {template ? 'Edit shift' : 'New shift template'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="shift-name">
              Shift name
            </label>
            <input
              id="shift-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shift Pagi"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="shift-start">
                Start time (optional)
              </label>
              <input
                id="shift-start"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:00"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="shift-end">
                End time (optional)
              </label>
              <input
                id="shift-end"
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="16:00"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Jobdesk list</label>
            <div className="space-y-2">
              {jobdesks.map((job, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => updateJobdesk(i, e.target.value)}
                    placeholder={`Jobdesk ${i + 1}`}
                    className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => removeJobdeskRow(i)}
                    disabled={jobdesks.length === 1}
                    className="p-2 rounded-lg text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Icon name="TrashIcon" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addJobdeskRow}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Icon name="PlusIcon" size={13} />
              Add jobdesk
            </button>
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
              {template ? 'Save changes' : 'Create shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
