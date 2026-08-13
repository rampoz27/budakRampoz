'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AlarmModal from './AlarmModal';
import { fetchAlarms, createAlarm, deleteAlarm, type AlarmRow, type AlarmInput } from '@/lib/supabase/alarms';

function formatAlarmTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AlarmsWorkspace() {
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const rows = await fetchAlarms();
      setAlarms(rows);
    } catch (err) {
      console.error('Failed to load alarms', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(input: AlarmInput) {
    const created = await createAlarm(input);
    setAlarms((prev) => [...prev, created].sort((a, b) => a.alarm_time.localeCompare(b.alarm_time)));
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this alarm?')) return;
    try {
      await deleteAlarm(id);
      setAlarms((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete alarm', err);
    }
  }

  const upcoming = alarms.filter((a) => !a.fired_at);
  const past = alarms.filter((a) => a.fired_at);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alarm</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set reminders manually, or just ask the AI in chat — e.g. &quot;ingatkan aku jam 3 sore buat follow up&quot;.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <Icon name="PlusIcon" size={16} />
          New alarm
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : alarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="ClockIcon" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No alarms yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Set one manually, or ask the AI to remind you about something.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
            >
              <Icon name="PlusIcon" size={14} />
              New alarm
            </button>
          </div>
        ) : (
          <div className="max-w-xl space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Upcoming
                </h2>
                <div className="space-y-2">
                  {upcoming.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon name="ClockIcon" size={16} className="text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{alarm.label}</p>
                          <p className="text-2xs text-muted-foreground">{formatAlarmTime(alarm.alarm_time)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(alarm.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Icon name="TrashIcon" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Already fired
                </h2>
                <div className="space-y-2">
                  {past.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="flex items-center justify-between bg-card/50 border border-border rounded-lg px-4 py-3 group opacity-70"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon name="CheckCircleIcon" size={16} className="text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-muted-foreground truncate line-through">{alarm.label}</p>
                          <p className="text-2xs text-muted-foreground">{formatAlarmTime(alarm.alarm_time)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(alarm.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Icon name="TrashIcon" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && <AlarmModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}
