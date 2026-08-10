'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { fetchProjects, type ProjectRow } from '@/lib/supabase/projects';
import type { FilterState } from './ProjectsHistoryWorkspace';

interface HistoryFiltersProps {
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
}

const MODELS = [
  { id: 'all', name: 'All Models' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
  { id: 'gpt-oss-120b-groq', name: 'GPT-OSS 120B' },
  { id: 'search-agent', name: 'AI Search Agent' },
];

const DATE_RANGES = [
  { id: 'all', name: 'All Time' },
  { id: 'today', name: 'Today' },
  { id: 'week', name: 'This Week' },
  { id: 'month', name: 'This Month' },
];

export default function HistoryFilters({ filters, onFilterChange }: HistoryFiltersProps) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const update = (key: keyof FilterState, value: string) =>
    onFilterChange({ ...filters, [key]: value });

  return (
    <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0 overflow-x-auto">
      {/* Search */}
      <div className="relative flex-shrink-0 w-64">
        <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects and conversations..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
        />
        {filters.search && (
          <button
            onClick={() => update('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="XMarkIcon" size={14} />
          </button>
        )}
      </div>

      {/* Project filter */}
      <select
        value={filters.projectId}
        onChange={(e) => update('projectId', e.target.value)}
        className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer flex-shrink-0"
      >
        <option value="all">All Projects</option>
        {projects.map((p) => (
          <option key={`proj-filter-${p.id}`} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Model filter */}
      <select
        value={filters.modelId}
        onChange={(e) => update('modelId', e.target.value)}
        className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer flex-shrink-0"
      >
        {MODELS.map((m) => (
          <option key={`model-filter-${m.id}`} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Date range */}
      <select
        value={filters.dateRange}
        onChange={(e) => update('dateRange', e.target.value)}
        className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer flex-shrink-0"
      >
        {DATE_RANGES.map((d) => (
          <option key={`date-filter-${d.id}`} value={d.id}>{d.name}</option>
        ))}
      </select>

      {/* Clear filters */}
      {(filters.search || filters.projectId !== 'all' || filters.modelId !== 'all' || filters.dateRange !== 'all') && (
        <button
          onClick={() => onFilterChange({ search: '', projectId: 'all', modelId: 'all', dateRange: 'all' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-all duration-150 flex-shrink-0"
        >
          <Icon name="XCircleIcon" size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}