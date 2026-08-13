'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Icon from './ui/AppIcon';
import { supabase } from '@/lib/supabase/client';
import { fetchActiveShiftSession } from '@/lib/supabase/shifts';
import { fetchPendingAlarms, markAlarmFired } from '@/lib/supabase/alarms';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Every route wrapped in AppLayout (chat, settings, snippets, file
    // analysis, projects) requires an active session — no session means
    // an immediate redirect to the login screen, before any protected
    // content ever renders.
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (!data.session) {
        router.replace('/');
        return;
      }
      setIsAuthenticated(true);
      setAuthChecked(true);
    });

    // Also react to sign-out or session expiry happening while the page
    // is already open (e.g. in another tab).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        router.replace('/');
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Every jam 6 (06:00 and 18:00), check the active shift for incomplete
  // jobdesk and fire a browser notification if any remain. Runs as long
  // as the app is open in some tab — this uses the Web Notifications API,
  // not a true background push, so it won't fire if the browser/tab is
  // fully closed.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let lastFiredAt = 0;
    const REPEAT_INTERVAL_MS = 15 * 60 * 1000; // re-remind every 15 minutes while still active

    // Reminder window: 06:00–07:59 (2h before a Malam shift's 08:00 end)
    // and 18:00–19:59 (2h before a Pagi shift's 20:00 end). Outside these
    // hours, no reminders fire at all — this is the "starts at jam 6"
    // part. Whether it keeps repeating past that is entirely governed by
    // the shift/task checks below: once the shift ends or every jobdesk
    // is checked off, fetchActiveShiftSession / incomplete.length simply
    // stop returning anything to notify about, so it self-stops without
    // needing to know the shift's exact end time.
    function isInReminderWindow(hour: number): boolean {
      return hour === 6 || hour === 7 || hour === 18 || hour === 19;
    }

    async function checkAndNotify() {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      if (!isInReminderWindow(now.getHours())) return;
      if (Date.now() - lastFiredAt < REPEAT_INTERVAL_MS) return;

      try {
        const session = await fetchActiveShiftSession();
        if (!session) return; // shift already ended — nothing to remind about

        const incomplete = session.tasks.filter((t) => !t.done);
        if (incomplete.length === 0) return; // everything's checked off — nothing to remind about

        lastFiredAt = Date.now();

        const notif = new Notification('Jobdesk belum selesai!', {
          body: `${incomplete.length} jobdesk di ${session.shift_name} masih belum dicentang:\n${incomplete
            .map((t) => `• ${t.text}`)
            .join('\n')}`,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = '/shifts';
        };
      } catch (err) {
        console.error('Failed to check shift for notification', err);
      }
    }

    checkAndNotify(); // also check immediately in case the app loads mid-window
    const interval = setInterval(checkAndNotify, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Checks for alarms whose time has arrived and fires a notification for
  // each, marking them as fired so they don't repeat. Checked every 30s
  // for reasonably tight timing (alarms are more time-sensitive than the
  // shift reminder, which only needs minute-level precision).
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    async function checkAlarms() {
      if (Notification.permission !== 'granted') return;

      try {
        const pending = await fetchPendingAlarms();
        const now = Date.now();

        for (const alarm of pending) {
          if (new Date(alarm.alarm_time).getTime() > now) continue;

          const notif = new Notification('⏰ Alarm!', {
            body: alarm.label,
            icon: '/favicon.ico',
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = '/alarms';
          };

          await markAlarmFired(alarm.id);
        }
      } catch (err) {
        console.error('Failed to check alarms', err);
      }
    }

    checkAlarms();
    const alarmInterval = setInterval(checkAlarms, 30_000);

    return () => clearInterval(alarmInterval);
  }, []);

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Icon name="ArrowPathIcon" size={24} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRoute={activeRoute}
      />
      <main
        className="flex-1 overflow-hidden flex flex-col"
        style={{ minWidth: 0 }}
      >
        {children}
      </main>
    </div>
  );
}
