'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { SnippetRow, SnippetInput } from '@/lib/supabase/snippets';

interface SnippetModalProps {
  snippet: SnippetRow | null; // null = creating a new snippet
  onClose: () => void;
  onSave: (input: SnippetInput) => Promise<void>;
}

const LANGUAGES = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'bash',
  'sql',
  'json',
  'css',
  'html',
  'go',
  'rust',
  'plaintext',
];

export default function SnippetModal({ snippet, onClose, onSave }: SnippetModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (snippet) {
      setTitle(snippet.title);
      setDescription(snippet.description || '');
      setLanguage(snippet.language);
      setCode(snippet.code);
      setTagsInput(snippet.tags.join(', '));
    }
  }, [snippet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!code.trim()) {
      setError('Code is required.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        language,
        code,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snippet.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {snippet ? 'Edit snippet' : 'New snippet'}
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
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="snippet-title">
              Title
            </label>
            <input
              id="snippet-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Debounce hook"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="snippet-desc">
              Description (optional)
            </label>
            <input
              id="snippet-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this snippet do?"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="snippet-lang">
                Language
              </label>
              <select
                id="snippet-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="snippet-tags">
                Tags (comma separated)
              </label>
              <input
                id="snippet-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="react, hooks"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="snippet-code">
              Code
            </label>
            <textarea
              id="snippet-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              placeholder="Paste your code here..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
            />
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
              {snippet ? 'Save changes' : 'Create snippet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}