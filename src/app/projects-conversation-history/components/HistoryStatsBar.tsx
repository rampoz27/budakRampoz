'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';

interface Stats {
  totalProjects: number;
  totalConversations: number;
  totalMessages: number;
  totalFilesAnalyzed: number;
  modelsUsed: string[];
}

export default function HistoryStatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, conversationsRes, filesRes] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('conversations').select('message_count, model_id'),
          supabase.from('file_analyses').select('id', { count: 'exact', head: true }),
        ]);

        const conversations = conversationsRes.data ?? [];
        const totalMessages = conversations.reduce((sum, c) => sum + (c.message_count || 0), 0);
        const modelsUsed = Array.from(
          new Set(conversations.map((c) => c.model_id).filter(Boolean) as string[])
        );

        setStats({
          totalProjects: projectsRes.count ?? 0,
          totalConversations: conversations.length,
          totalMessages,
          totalFilesAnalyzed: filesRes.count ?? 0,
          modelsUsed,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    }
    load();
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center px-6 py-4 border-b border-border flex-shrink-0">
        <Icon name="ArrowPathIcon" size={16} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  const items = [
    { label: 'Total Projects', value: stats.totalProjects.toLocaleString() },
    { label: 'Conversations', value: stats.totalConversations.toLocaleString() },
    { label: 'Messages Sent', value: stats.totalMessages.toLocaleString() },
    { label: 'Files Analyzed', value: stats.totalFilesAnalyzed.toLocaleString() },
    {
      label: 'Models Used',
      value: stats.modelsUsed.length.toString(),
      sub: stats.modelsUsed.length > 0 ? stats.modelsUsed.join(' · ') : 'None yet',
    },
  ];

  return (
    <div className="flex items-center gap-0 px-6 py-3 border-b border-border flex-shrink-0 overflow-x-auto">
      {items.map((stat, i) => (
        <div
          key={`stat-${stat.label}`}
          className={`flex flex-col px-5 py-1 flex-shrink-0 ${i > 0 ? 'border-l border-border' : ''}`}
        >
          <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            {stat.label}
          </span>
          <span className="text-xl font-bold text-foreground tabular-nums">{stat.value}</span>
          <span className="text-2xs font-medium mt-0.5 text-muted-foreground truncate max-w-[180px]">
            {stat.sub ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}