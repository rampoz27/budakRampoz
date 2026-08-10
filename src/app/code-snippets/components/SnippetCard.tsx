'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { SnippetRow } from '@/lib/supabase/snippets';

interface SnippetCardProps {
  snippet: SnippetRow;
  onEdit: () => void;
  onDelete: () => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  tsx: '#06B6D4',
  ts: '#3178C6',
  typescript: '#3178C6',
  jsx: '#61DAFB',
  js: '#F7DF1E',
  javascript: '#F7DF1E',
  python: '#3776AB',
  py: '#3776AB',
  bash: '#4EAA25',
  sh: '#4EAA25',
  sql: '#E38C00',
  json: '#FFA500',
  css: '#1572B6',
  html: '#E34F26',
  go: '#00ADD8',
  rust: '#DEA584',
  plaintext: '#888',
};

const PREVIEW_LINES = 8;

export default function SnippetCard({ snippet, onEdit, onDelete }: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = snippet.code.split('\n');
  const isTruncated = lines.length > PREVIEW_LINES;
  const visibleLines = expanded ? lines : lines.slice(0, PREVIEW_LINES);
  const langColor = LANGUAGE_COLORS[snippet.language.toLowerCase()] || '#888';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-foreground truncate">{snippet.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit snippet"
            >
              <Icon name="PencilIcon" size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
              title="Delete snippet"
            >
              <Icon name="TrashIcon" size={13} />
            </button>
          </div>
        </div>
        {snippet.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{snippet.description}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-2xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${langColor}20`, color: langColor }}
          >
            {snippet.language}
          </span>
          {snippet.tags.map((tag) => (
            <span key={tag} className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Code preview */}
      <div className="relative flex-1">
        <div className="overflow-x-auto">
          <pre className="text-xs font-mono p-3 leading-6">
            <code>
              {visibleLines.map((line, i) => (
                <div key={`${snippet.id}-line-${i}`} className="flex">
                  <span className="select-none text-muted-foreground w-7 text-right pr-2.5 flex-shrink-0 text-2xs leading-6">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-secondary-foreground">{line || ' '}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
        {isTruncated && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-2xs text-primary hover:text-primary/80 py-1.5 border-t border-border transition-colors"
          >
            {expanded ? 'Show less' : `Show ${lines.length - PREVIEW_LINES} more lines`}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
        <span className="text-2xs text-muted-foreground">
          {new Date(snippet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all ${
            copied ? 'text-positive bg-positive/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Icon name={copied ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={13} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}