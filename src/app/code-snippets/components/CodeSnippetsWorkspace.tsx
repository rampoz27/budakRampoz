'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import SnippetCard from './SnippetCard';
import SnippetModal from './SnippetModal';
import {
  fetchSnippets,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  type SnippetRow,
  type SnippetInput,
} from '@/lib/supabase/snippets';

// undefined = modal closed, null = creating a new snippet, SnippetRow = editing
type ModalState = SnippetRow | null | undefined;

export default function CodeSnippetsWorkspace() {
  const [snippets, setSnippets] = useState<SnippetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [modalState, setModalState] = useState<ModalState>(undefined);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const rows = await fetchSnippets();
      setSnippets(rows);
    } catch (err) {
      console.error('Failed to load snippets', err);
    } finally {
      setIsLoading(false);
    }
  }

  const languages = useMemo(() => {
    const set = new Set(snippets.map((s) => s.language));
    return ['all', ...Array.from(set)];
  }, [snippets]);

  const filtered = snippets.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q));
    const matchesLanguage = languageFilter === 'all' || s.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  async function handleSave(input: SnippetInput) {
    if (modalState) {
      const updated = await updateSnippet(modalState.id, input);
      setSnippets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await createSnippet(input);
      setSnippets((prev) => [created, ...prev]);
    }
    setModalState(undefined);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snippet? This cannot be undone.')) return;
    try {
      await deleteSnippet(id);
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete snippet', err);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Code Snippets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save and reuse pieces of code across projects
          </p>
        </div>
        <button
          onClick={() => setModalState(null)}
          className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <Icon name="PlusIcon" size={16} />
          New snippet
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang === 'all' ? 'All languages' : lang}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="CodeBracketIcon" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {snippets.length === 0 ? 'No snippets yet' : 'No snippets match your search'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {snippets.length === 0
                ? 'Save your first reusable piece of code.'
                : 'Try a different search or filter.'}
            </p>
            {snippets.length === 0 && (
              <button
                onClick={() => setModalState(null)}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              >
                <Icon name="PlusIcon" size={14} />
                New snippet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {filtered.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onEdit={() => setModalState(snippet)}
                onDelete={() => handleDelete(snippet.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalState !== undefined && (
        <SnippetModal
          snippet={modalState}
          onClose={() => setModalState(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}