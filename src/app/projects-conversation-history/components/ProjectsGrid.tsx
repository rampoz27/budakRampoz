'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import ProjectModal from './ProjectModal';
import {
  fetchProjectsWithStats,
  createProject,
  updateProject,
  deleteProject,
  type ProjectWithStats,
  type ProjectRow,
  type ProjectInput,
} from '@/lib/supabase/projects';

interface ProjectsGridProps {
  searchQuery: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-positive bg-positive/10',
  paused: 'text-warning bg-warning/10',
  archived: 'text-muted-foreground bg-muted',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// undefined = modal closed, null = creating, ProjectRow = editing
type ModalState = ProjectRow | null | undefined;

export default function ProjectsGrid({ searchQuery }: ProjectsGridProps) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>(undefined);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const rows = await fetchProjectsWithStats();
      setProjects(rows);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSave(input: ProjectInput) {
    if (modalState) {
      const updated = await updateProject(modalState.id, input);
      await load();
      void updated;
    } else {
      await createProject(input);
      await load();
    }
    setModalState(undefined);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? Its conversations will stay, just unassigned.')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{filtered.length} projects</p>
        <button
          onClick={() => setModalState(null)}
          className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <Icon name="PlusIcon" size={14} />
          New project
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Icon name="FolderIcon" size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {projects.length === 0 ? 'No projects yet' : 'No projects match your search'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {projects.length === 0
              ? 'Create a project to group related conversations together.'
              : 'Try a different search.'}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => setModalState(null)}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
            >
              <Icon name="PlusIcon" size={14} />
              New project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-xl p-4 flex flex-col group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="FolderIcon" size={18} className="text-primary" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModalState(project)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit project"
                  >
                    <Icon name="PencilIcon" size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                    title="Delete project"
                  >
                    <Icon name="TrashIcon" size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
                <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${STATUS_COLORS[project.status]}`}>
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">
                  {project.description}
                </p>
              )}

              {project.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon name="ChatBubbleLeftIcon" size={13} />
                  {project.conversationCount} convos
                </div>
                <span className="text-2xs text-muted-foreground">
                  {project.lastActive ? `Active ${timeAgo(project.lastActive)}` : 'No activity yet'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalState !== undefined && (
        <ProjectModal
          project={modalState}
          onClose={() => setModalState(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}