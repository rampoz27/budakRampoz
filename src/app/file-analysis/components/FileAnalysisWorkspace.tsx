'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AnalysisMarkdown from './AnalysisMarkdown';
import {
  fetchFileAnalyses,
  createFileAnalysis,
  deleteFileAnalysis,
  type FileAnalysisRow,
} from '@/lib/supabase/file-analyses';

const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  sql: 'sql',
  sh: 'bash',
  css: 'css',
  html: 'html',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
};

function inferLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_LANGUAGE[ext] || 'plaintext';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FileAnalysisWorkspace() {
  const [history, setHistory] = useState<FileAnalysisRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selected, setSelected] = useState<FileAnalysisRow | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoadingHistory(true);
    try {
      const rows = await fetchFileAnalyses();
      setHistory(rows);
    } catch (err) {
      console.error('Failed to load file analyses', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function analyzeFile(file: File) {
    setError('');
    setIsAnalyzing(true);
    setSelected(null);

    try {
      const content = await file.text();
      const language = inferLanguage(file.name);

      const res = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, language, content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');

      const saved = await createFileAnalysis({
        fileName: file.name,
        fileSize: file.size,
        language,
        analysis: data.analysis,
      });

      setHistory((prev) => [saved, ...prev]);
      setSelected(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong analyzing the file.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyzeFile(file);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this analysis? This cannot be undone.')) return;
    try {
      await deleteFileAnalysis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Failed to delete file analysis', err);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* History sidebar */}
      <div className="w-72 flex flex-col border-r border-border bg-card/50 flex-shrink-0 overflow-hidden">
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <h1 className="text-base font-bold text-foreground">File Analysis</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Upload code, get an AI review</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="ArrowPathIcon" size={18} className="text-muted-foreground animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Icon name="DocumentMagnifyingGlassIcon" size={22} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No files analyzed yet</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
                className={`group w-full text-left px-3 py-2.5 mx-2 mb-1 rounded-lg transition-all duration-150 cursor-pointer ${
                  selected?.id === item.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold truncate font-mono ${selected?.id === item.id ? 'text-primary' : 'text-foreground'}`}>
                    {item.file_name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="hidden group-hover:block p-0.5 rounded text-muted-foreground hover:text-negative flex-shrink-0"
                    title="Delete"
                  >
                    <Icon name="TrashIcon" size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xs text-muted-foreground">{item.language}</span>
                  <span className="text-2xs text-muted-foreground">·</span>
                  <span className="text-2xs text-muted-foreground">{timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground font-mono">{selected.file_name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.language} · {formatBytes(selected.file_size)} · {timeAgo(selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Icon name="ArrowUpTrayIcon" size={14} />
                Analyze another
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <AnalysisMarkdown content={selected.analysis} />
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Icon name="ArrowPathIcon" size={32} className="text-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground">Analyzing your file...</p>
                <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
                  <Icon name="DocumentMagnifyingGlassIcon" size={28} className="text-white" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Drop a code file here</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get a summary, potential issues, and suggestions
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  <Icon name="ArrowUpTrayIcon" size={16} />
                  Choose a file
                </button>
                {error && <p className="text-xs text-negative mt-4">{error}</p>}
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept=".ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.rb,.php,.sql,.sh,.css,.html,.json,.yml,.yaml,.txt,.md"
        />
      </div>
    </div>
  );
}