'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Icon from './ui/AppIcon';
import { supabase } from '@/lib/supabase/client';

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
