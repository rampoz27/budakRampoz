'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { ProjectRow, ProjectInput, ProjectStatus } from '@/lib/supabase/projects';

interface ProjectModalProps {
  project: ProjectRow | null; // null = creating a new project
  onClose: () => void;
  onSave: (input: ProjectInput) => Promise<void>;
}

const STATUSES: ProjectStatus[] = ['active', 'paused', 'archived'];

export default function ProjectModal({ project, onClose, onSave }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techInput, setTechInput] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setTechInput(project.tech_stack.join(', '));
      setStatus(project.status);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        tech_stack: techInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {project ? 'Edit project' : 'New project'}
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
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. E-Commerce Frontend"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-desc">
              Description
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this project about?"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-tech">
                Tech stack (comma separated)
              </label>
              <input
                id="project-tech"
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                placeholder="Next.js, TypeScript"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-status">
                Status
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
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
              {project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}