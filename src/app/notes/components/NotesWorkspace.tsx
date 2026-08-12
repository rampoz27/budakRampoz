'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import NoteModal from './NoteModal';
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  findRelevantNotes,
  type NoteRow,
  type NoteInput,
  type MatchedNote,
} from '@/lib/supabase/notes';

type ModalState = NoteRow | null | undefined; // undefined = closed, null = creating

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotesWorkspace() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<ModalState>(undefined);

  // "Try it" semantic search panel
  const [tryQuery, setTryQuery] = useState('');
  const [tryResults, setTryResults] = useState<MatchedNote[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const rows = await fetchNotes();
      setNotes(rows);
    } catch (err) {
      console.error('Failed to load notes', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  async function handleSave(input: NoteInput) {
    if (modalState) {
      const updated = await updateNote(modalState.id, input);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } else {
      const created = await createNote(input);
      setNotes((prev) => [created, ...prev]);
    }
    setModalState(undefined);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  }

  async function handleTrySearch(e: React.FormEvent) {
    e.preventDefault();
    if (!tryQuery.trim()) return;
    setIsSearching(true);
    setTryResults(null);
    try {
      const results = await findRelevantNotes(tryQuery.trim());
      setTryResults(results);
    } catch (err) {
      console.error('Semantic search failed', err);
      setTryResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your second brain — capture anything, and the AI will find it when relevant.
          </p>
        </div>
        <button
          onClick={() => setModalState(null)}
          className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <Icon name="PlusIcon" size={16} />
          New note
        </button>
      </div>

      {/* Try semantic search */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-muted/20">
        <form onSubmit={handleTrySearch} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Icon name="SparklesIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input
              type="text"
              placeholder="Try semantic search — ask something, not just keywords..."
              value={tryQuery}
              onChange={(e) => setTryQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {isSearching && <Icon name="ArrowPathIcon" size={12} className="animate-spin" />}
            Search
          </button>
        </form>

        {tryResults !== null && (
          <div className="mt-3 space-y-2">
            {tryResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sufficiently relevant notes found.</p>
            ) : (
              tryResults.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground">{r.title}</p>
                    <span className="text-2xs text-primary font-mono">{Math.round(r.similarity * 100)}% match</span>
                  </div>
                  <p className="text-2xs text-muted-foreground line-clamp-2">{r.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* List controls */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Filter notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
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
              <Icon name="LightBulbIcon" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {notes.length === 0 ? 'No notes yet' : 'No notes match your filter'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {notes.length === 0
                ? 'Capture an idea, a decision, or anything worth remembering.'
                : 'Try a different search.'}
            </p>
            {notes.length === 0 && (
              <button
                onClick={() => setModalState(null)}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              >
                <Icon name="PlusIcon" size={14} />
                New note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {filtered.map((note) => (
              <div
                key={note.id}
                className="bg-card border border-border rounded-xl p-4 flex flex-col group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-foreground truncate">{note.title}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => setModalState(note)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Edit note"
                    >
                      <Icon name="PencilIcon" size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                      title="Delete note"
                    >
                      <Icon name="TrashIcon" size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-secondary-foreground mb-3 line-clamp-4 flex-1">{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {note.tags.map((tag) => (
                      <span key={tag} className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-2xs text-muted-foreground pt-2 border-t border-border">
                  {timeAgo(note.updated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalState !== undefined && (
        <NoteModal note={modalState} onClose={() => setModalState(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
