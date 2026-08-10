'use client';

import React, { useState } from 'react';
import ProjectsGrid from './ProjectsGrid';
import ConversationHistoryTable from './ConversationHistoryTable';
import HistoryFilters from './HistoryFilters';
import HistoryStatsBar from './HistoryStatsBar';

export type FilterState = {
  search: string;
  projectId: string;
  modelId: string;
  dateRange: string;
};

export default function ProjectsHistoryWorkspace() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    projectId: 'all',
    modelId: 'all',
    dateRange: 'all',
  });
  const [activeSection, setActiveSection] = useState<'projects' | 'conversations'>('projects');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Projects & History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your coding projects and conversation archive</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-all duration-150">
            <span>Import</span>
          </button>
          <button className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150">
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <HistoryStatsBar />

      {/* Section tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 flex-shrink-0">
        <button
          onClick={() => setActiveSection('projects')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeSection === 'projects' ?'bg-primary/15 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveSection('conversations')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeSection === 'conversations' ?'bg-primary/15 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          All Conversations
        </button>
      </div>

      {/* Filters */}
      <HistoryFilters filters={filters} onFilterChange={setFilters} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeSection === 'projects' ? (
          <ProjectsGrid searchQuery={filters.search} />
        ) : (
          <ConversationHistoryTable filters={filters} />
        )}
      </div>
    </div>
  );
}