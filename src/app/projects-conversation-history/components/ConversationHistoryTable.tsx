'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import {
  fetchConversationsWithProjects,
  updateConversationProject,
  deleteConversation,
  type ConversationWithProject,
} from '@/lib/supabase/conversations';
import { fetchProjects, type ProjectRow } from '@/lib/supabase/projects';
import type { FilterState } from './ProjectsHistoryWorkspace';

interface ConversationHistoryTableProps {
  filters: FilterState;
}

type SortField = 'title' | 'messageCount' | 'updatedAt';

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o': '#10A37F',
  'gpt-4-turbo': '#10A37F',
  'claude-3-5-sonnet': '#D97706',
  'claude-3-haiku': '#D97706',
  'gemini-pro': '#4285F4',
  'llama-3.3-70b': '#F55036',
  'gpt-oss-120b-groq': '#F55036',
  'search-agent': '#22C55E',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ConversationHistoryTable({ filters }: ConversationHistoryTableProps) {
  const [conversations, setConversations] = useState<ConversationWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const [convRows, projectRows] = await Promise.all([
        fetchConversationsWithProjects(),
        fetchProjects(),
      ]);
      setConversations(convRows);
      setProjects(projectRows);
    } catch (err) {
      console.error('Failed to load conversation history', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <Icon name="ChevronUpDownIcon" size={12} className="ml-1 text-muted-foreground" />;
    return (
      <Icon
        name={sortDir === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'}
        size={12}
        className="ml-1 text-foreground"
      />
    );
  }

  const now = Date.now();
  const filtered = conversations.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(filters.search.toLowerCase());
    const matchesProject = filters.projectId === 'all' || c.project_id === filters.projectId;
    const matchesModel = filters.modelId === 'all' || c.model_id === filters.modelId;

    let matchesDate = true;
    if (filters.dateRange !== 'all') {
      const age = now - new Date(c.updated_at).getTime();
      if (filters.dateRange === 'today') matchesDate = age < 86_400_000;
      if (filters.dateRange === 'week') matchesDate = age < 7 * 86_400_000;
      if (filters.dateRange === 'month') matchesDate = age < 30 * 86_400_000;
    }

    return matchesSearch && matchesProject && matchesModel && matchesDate;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    if (sortField === 'messageCount') cmp = a.message_count - b.message_count;
    if (sortField === 'updatedAt') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  async function handleProjectAssign(convId: string, projectId: string) {
    const resolvedId = projectId === 'none' ? null : projectId;
    try {
      await updateConversationProject(convId, resolvedId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, project_id: resolvedId, project_name: projects.find((p) => p.id === resolvedId)?.name ?? null }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to assign project', err);
    }
  }

  async function handleDelete(convId: string) {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="ChatBubbleLeftRightIcon" size={28} className="text-muted-foreground mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">No conversations yet</h3>
        <p className="text-xs text-muted-foreground">Start a chat to see it show up here.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Title <SortIcon field="title" />
                </button>
              </th>
              <th className="text-left px-3 py-3">
                <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Project</span>
              </th>
              <th className="text-left px-3 py-3">
                <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Model</span>
              </th>
              <th className="text-left px-3 py-3">
                <button
                  onClick={() => handleSort('messageCount')}
                  className="flex items-center text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Messages <SortIcon field="messageCount" />
                </button>
              </th>
              <th className="text-left px-3 py-3">
                <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Last message</span>
              </th>
              <th className="text-left px-3 py-3">
                <button
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Updated <SortIcon field="updatedAt" />
                </button>
              </th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((conv, rowIdx) => (
              <tr
                key={conv.id}
                className={`border-b border-border last:border-b-0 transition-colors duration-100 ${
                  rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                } hover:bg-muted/30`}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                </td>

                <td className="px-3 py-3">
                  <select
                    value={conv.project_id || 'none'}
                    onChange={(e) => handleProjectAssign(conv.id, e.target.value)}
                    className="bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer max-w-[140px]"
                  >
                    <option value="none">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-3 py-3">
                  <span
                    className="text-2xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: `${MODEL_COLORS[conv.model_id || ''] || '#7C3AED'}20`,
                      color: MODEL_COLORS[conv.model_id || ''] || '#7C3AED',
                    }}
                  >
                    {conv.model_id || 'unknown'}
                  </span>
                </td>

                <td className="px-3 py-3">
                  <span className="text-sm text-secondary-foreground tabular-nums">{conv.message_count}</span>
                </td>

                <td className="px-3 py-3 max-w-[240px]">
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message || '—'}</p>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-xs text-muted-foreground">{timeAgo(conv.updated_at)}</span>
                </td>

                <td className="px-3 py-3">
                  <div className={`flex items-center gap-1 transition-opacity duration-150 ${hoveredId === conv.id ? 'opacity-100' : 'opacity-0'}`}>
                    <Link
                      href="/ai-chat-interface"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                      title="Open conversation"
                    >
                      <Icon name="ArrowTopRightOnSquareIcon" size={13} />
                    </Link>
                    <button
                      onClick={() => handleDelete(conv.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-negative hover:bg-negative/10 transition-all duration-150"
                      title="Delete conversation — this cannot be undone"
                    >
                      <Icon name="TrashIcon" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={`perpage-${n}`} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {sorted.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="ChevronLeftIcon" size={14} />
          </button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="ChevronRightIcon" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}