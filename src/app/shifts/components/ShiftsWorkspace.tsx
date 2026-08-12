'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import ShiftTemplateModal from './ShiftTemplateModal';
import {
  fetchShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  fetchActiveShiftSession,
  startShiftSession,
  updateSessionTasks,
  endShiftSession,
  type ShiftTemplateRow,
  type ShiftTemplateInput,
  type ShiftSessionRow,
  type ShiftTask,
} from '@/lib/supabase/shifts';

type ModalState = ShiftTemplateRow | null | undefined; // undefined = closed, null = creating

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ShiftsWorkspace() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [templates, setTemplates] = useState<ShiftTemplateRow[]>([]);
  const [activeSession, setActiveSession] = useState<ShiftSessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(undefined);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    load();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  function handleTestNotification() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser kamu nggak mendukung Notification API.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert(
        'Notifikasi diblokir buat situs ini. Klik ikon gembok/info di address bar browser → Site settings → Notifications → Allow, terus refresh halaman ini.'
      );
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification('Test notifikasi CodeMind', {
            body: 'Kalau kamu lihat ini, notifikasi kamu udah jalan!',
            icon: '/favicon.ico',
          });
        }
      });
      return;
    }

    new Notification('Test notifikasi CodeMind', {
      body: activeSession
        ? `Contoh: ${activeSession.tasks.filter((t) => !t.done).length} jobdesk masih belum dicentang di ${activeSession.shift_name}.`
        : 'Kalau kamu lihat ini, notifikasi kamu udah jalan! (Belum ada shift aktif buat contoh isinya.)',
      icon: '/favicon.ico',
    });
  }

  async function load() {
    setIsLoading(true);
    try {
      const [templateRows, session] = await Promise.all([
        fetchShiftTemplates(),
        fetchActiveShiftSession(),
      ]);
      setTemplates(templateRows);
      setActiveSession(session);
      if (templateRows.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templateRows[0].id);
      }
    } catch (err) {
      console.error('Failed to load shift data', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartShift() {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    setIsStarting(true);
    try {
      const session = await startShiftSession(template);
      setActiveSession(session);
    } catch (err) {
      console.error('Failed to start shift', err);
    } finally {
      setIsStarting(false);
    }
  }

  async function toggleTask(task: ShiftTask) {
    if (!activeSession) return;
    const updatedTasks = activeSession.tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            done: !t.done,
            done_by: !t.done ? ('user' as const) : null,
            done_at: !t.done ? new Date().toISOString() : null,
          }
        : t
    );
    setActiveSession({ ...activeSession, tasks: updatedTasks });
    try {
      await updateSessionTasks(activeSession.id, updatedTasks);
    } catch (err) {
      console.error('Failed to update task', err);
    }
  }

  function handleEndShiftClick() {
    if (!activeSession) return;
    const incomplete = activeSession.tasks.filter((t) => !t.done);
    if (incomplete.length > 0) {
      setShowEndConfirm(true);
    } else {
      confirmEndShift();
    }
  }

  async function confirmEndShift() {
    if (!activeSession) return;
    setIsEnding(true);
    try {
      await endShiftSession(activeSession.id);
      setActiveSession(null);
      setShowEndConfirm(false);
    } catch (err) {
      console.error('Failed to end shift', err);
    } finally {
      setIsEnding(false);
    }
  }

  async function handleSaveTemplate(input: ShiftTemplateInput) {
    if (modalState) {
      const updated = await updateShiftTemplate(modalState.id, input);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await createShiftTemplate(input);
      setTemplates((prev) => [...prev, created]);
      if (!selectedTemplateId) setSelectedTemplateId(created.id);
    }
    setModalState(undefined);
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm('Delete this shift template? This cannot be undone.')) return;
    try {
      await deleteShiftTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete shift template', err);
    }
  }

  const incompleteTasks = activeSession?.tasks.filter((t) => !t.done) ?? [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-foreground mb-1">Shift</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Track your current shift and jobdesk checklist.
        </p>

        {/* Notification status + test button */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2">
            <Icon
              name={notificationPermission === 'granted' ? 'BellAlertIcon' : 'BellSlashIcon'}
              size={16}
              className={notificationPermission === 'granted' ? 'text-positive' : 'text-muted-foreground'}
            />
            <div>
              <p className="text-xs font-medium text-foreground">
                Notifikasi:{' '}
                {notificationPermission === 'granted'
                  ? 'Aktif'
                  : notificationPermission === 'denied'
                    ? 'Diblokir'
                    : notificationPermission === 'unsupported'
                      ? 'Tidak didukung browser'
                      : 'Belum diizinkan'}
              </p>
              <p className="text-2xs text-muted-foreground">
                Muncul otomatis jam 06:00–07:59 & 18:00–19:59 kalau ada jobdesk belum selesai
              </p>
            </div>
          </div>
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            Test notifikasi
          </button>
        </div>

        {/* Current shift card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          {activeSession ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
                  <h2 className="text-sm font-semibold text-foreground">{activeSession.shift_name}</h2>
                </div>
                <span className="text-2xs text-muted-foreground">
                  Started {formatTime(activeSession.started_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {activeSession.tasks.filter((t) => t.done).length} / {activeSession.tasks.length} jobdesk selesai
              </p>

              <div className="space-y-2 mb-5">
                {activeSession.tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 bg-muted/40 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task)}
                      className="w-4 h-4 mt-0.5 rounded border-border bg-input accent-primary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          task.done ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}
                      >
                        {task.text}
                      </p>
                      {task.done && task.done_by && (
                        <span className="text-2xs text-positive flex items-center gap-1 mt-0.5">
                          <Icon
                            name={task.done_by === 'ai' ? 'SparklesIcon' : 'CheckIcon'}
                            size={11}
                          />
                          {task.done_by === 'ai' ? 'Checked by AI' : 'Checked manually'}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleEndShiftClick}
                className="w-full flex items-center justify-center gap-2 bg-negative/10 text-negative border border-negative/30 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-negative/20 active:scale-95 transition-all"
              >
                <Icon name="StopCircleIcon" size={15} />
                End shift
              </button>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-foreground mb-1">No active shift</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Pick a shift template and start your checklist.
              </p>
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  You don&apos;t have any shift templates yet — create one below first.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.jobdesks.length} jobdesk)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartShift}
                    disabled={isStarting}
                    className="flex items-center gap-2 bg-gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isStarting && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                    Start shift
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Shift templates */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Shift templates</h2>
          <button
            onClick={() => setModalState(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <Icon name="PlusIcon" size={13} />
            New template
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No shift templates yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                  <p className="text-2xs text-muted-foreground truncate">
                    {template.jobdesks.length} jobdesk
                    {template.start_time && ` · ${template.start_time}–${template.end_time || '?'}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => setModalState(template)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Icon name="PencilIcon" size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                    title="Delete"
                  >
                    <Icon name="TrashIcon" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End-shift confirmation popup */}
      {showEndConfirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="ExclamationTriangleIcon" size={18} className="text-warning" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {incompleteTasks.length} jobdesk belum selesai
                </h2>
              </div>
              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                {incompleteTasks.map((t) => (
                  <p key={t.id} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Icon name="XCircleIcon" size={13} className="text-negative flex-shrink-0 mt-0.5" />
                    {t.text}
                  </p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Yakin mau akhirin shift walau masih ada yang belum dicentang?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={confirmEndShift}
                  disabled={isEnding}
                  className="flex items-center gap-2 bg-negative text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {isEnding && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                  Tetap akhiri shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalState !== undefined && (
        <ShiftTemplateModal
          template={modalState}
          onClose={() => setModalState(undefined)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
