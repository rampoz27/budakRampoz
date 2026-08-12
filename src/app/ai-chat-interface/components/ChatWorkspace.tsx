'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationSidebar from './ConversationSidebar';
import Icon from '@/components/ui/AppIcon';
import { fetchPersonaForModel, buildPersonaPrompt } from '@/lib/supabase/ai-settings';
import {
  findRelevantNotes,
  hasAnyNotes,
  createNote,
  deleteNote,
  updateNote,
  searchNotesByText,
} from '@/lib/supabase/notes';
import { detectNoteTrigger } from '@/lib/note-trigger';
import { AI_MODELS } from '@/lib/models';
import {
  fetchConversations,
  fetchMessages,
  createConversation,
  saveMessage,
  deleteConversation,
  type ConversationRow,
} from '@/lib/supabase/conversations';
import type { Message, AIModel, Conversation } from './chatTypes';

// Executes a matched note command and returns the confirmation text to
// show in chat. Kept outside the component since it doesn't touch React
// state directly — just Supabase calls and plain logic.
async function handleNoteCommand(
  trigger: ReturnType<typeof detectNoteTrigger>,
  lastAssistantContent: string | undefined
): Promise<string> {
  if (trigger.action === 'add') {
    const noteContent = trigger.newContent || lastAssistantContent || '';
    if (!noteContent.trim()) {
      return "I don't have anything to save yet — either write what to save after your command (e.g. \"tambahkan ke note: ...\"), or ask something first so there's a reply to save.";
    }
    const title = noteContent.trim().split('\n')[0].slice(0, 60) || 'Untitled note';
    await createNote({ title, content: noteContent.trim(), tags: ['from-chat'] });
    return `✅ Saved to your notes: **"${title}"**`;
  }

  if (trigger.action === 'delete') {
    if (!trigger.target.trim()) {
      return 'Which note should I delete? Try something like "hapus note supabase".';
    }
    const matches = await searchNotesByText(trigger.target.trim());
    if (matches.length === 0) {
      return `I couldn't find a note matching "${trigger.target}".`;
    }
    if (matches.length > 1) {
      const list = matches.map((m) => `- "${m.title}"`).join('\n');
      return `Found more than one note matching "${trigger.target}" — be more specific:\n\n${list}`;
    }
    const note = matches[0];
    const confirmed = confirm(`Delete note "${note.title}"? This cannot be undone.`);
    if (!confirmed) return 'Cancelled — the note was not deleted.';
    await deleteNote(note.id);
    return `🗑️ Deleted note: **"${note.title}"**`;
  }

  if (trigger.action === 'edit') {
    if (!trigger.target.trim()) {
      return 'Which note should I edit? Try something like "edit note supabase: new content here".';
    }
    if (!trigger.newContent.trim()) {
      return `Found the note you mean, but I need the new content too — try "edit note ${trigger.target}: <new content>".`;
    }
    const matches = await searchNotesByText(trigger.target.trim());
    if (matches.length === 0) {
      return `I couldn't find a note matching "${trigger.target}".`;
    }
    if (matches.length > 1) {
      const list = matches.map((m) => `- "${m.title}"`).join('\n');
      return `Found more than one note matching "${trigger.target}" — be more specific:\n\n${list}`;
    }
    const note = matches[0];
    await updateNote(note.id, { title: note.title, content: trigger.newContent.trim(), tags: note.tags });
    return `✏️ Updated note: **"${note.title}"**`;
  }

  return "I recognized that as a note command but couldn't figure out what to do with it.";
}

function toUiConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    projectName: 'General',
    projectId: 'proj-000',
    lastMessage: row.last_message || 'No messages yet',
    timestamp: row.updated_at,
    messageCount: row.message_count,
    modelId: row.model_id || 'llama-3.3-70b',
    fileCount: 0,
  };
}

export default function ChatWorkspace() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await fetchConversations();
      setConversations(rows);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    hasAnyNotes()
      .then(setHasNotes)
      .catch((err) => console.error('Failed to check for notes', err));
  }, [loadConversations]);

  // Every time the model changes, load THAT model's persona — this is what
  // makes each model answer with its own personality mid-conversation.
  useEffect(() => {
    let isCancelled = false;
    fetchPersonaForModel(selectedModel.id)
      .then((settings) => {
        if (!isCancelled) setPersonaPrompt(buildPersonaPrompt(settings));
      })
      .catch((err) => console.error('Failed to load persona for model', selectedModel.id, err));
    return () => {
      isCancelled = true;
    };
  }, [selectedModel.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    setActiveConversation(conv);
    setIsLoadingMessages(true);
    setTypingMessageId(null);
    try {
      const rows = await fetchMessages(id);
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          timestamp: r.created_at,
          model: r.model_id || undefined,
        }))
      );
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setTypingMessageId(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // If the deleted conversation was open, fall back to a blank chat.
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSendMessage = async (content: string, files: File[]) => {
    let conv = activeConversation;

    // Lazily create the conversation on the first message, like ChatGPT/Claude do.
    if (!conv) {
      try {
        const title = content.trim().slice(0, 60) || 'New conversation';
        conv = await createConversation(title, selectedModel.id);
        setActiveConversation(conv);
        setConversations((prev) => [conv as ConversationRow, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation', err);
        return;
      }
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsStreaming(true);

    // Note commands ("tambahkan ke note...", "hapus note...", "edit
    // note...") are handled entirely locally, no LLM call needed, so
    // they're near-instant.
    const trigger = detectNoteTrigger(content);
    if (trigger.matched) {
      try {
        await saveMessage(conv.id, 'user', content, selectedModel.id);

        const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
        const confirmationText = await handleNoteCommand(trigger, lastAssistantMsg?.content);

        const confirmationMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: confirmationText,
          timestamp: new Date().toISOString(),
          model: selectedModel.id,
        };

        setMessages((prev) => [...prev, confirmationMsg]);
        await saveMessage(conv.id, 'assistant', confirmationText, selectedModel.id);
        await loadConversations();
      } catch (err) {
        const errorMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Failed to save note.'}`,
          timestamp: new Date().toISOString(),
          model: selectedModel.id,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    try {
      // saveMessage and the note lookup don't depend on each other, so run
      // them concurrently instead of one after another. Skip the lookup
      // entirely if the user has no notes — no point paying for an
      // embedding call that can never find anything.
      const notesLookup = hasNotes
        ? findRelevantNotes(content).catch((err) => {
            console.error('Note lookup failed, continuing without it', err);
            return [];
          })
        : Promise.resolve([]);

      const [, relevantNotes] = await Promise.all([
        saveMessage(conv.id, 'user', content, selectedModel.id),
        notesLookup,
      ]);

      const ragContext =
        relevantNotes.length > 0
          ? relevantNotes.map((n) => `Note: "${n.title}"\n${n.content}`).join('\n\n---\n\n')
          : '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel.id,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          personaPrompt,
          ragContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The AI request failed.');

      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        model: data.actualModelId || selectedModel.id,
      };

      setMessages((prev) => [...prev, aiResponse]);
      setTypingMessageId(aiResponse.id);
      await saveMessage(conv.id, 'assistant', data.content, data.actualModelId || selectedModel.id);
      await loadConversations();
    } catch (err) {
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong reaching the AI.'}`,
        timestamp: new Date().toISOString(),
        model: selectedModel.id,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const uiConversations = conversations.map(toUiConversation);

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationSidebar
        conversations={uiConversations}
        activeId={activeConversation?.id || ''}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        models={AI_MODELS}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ChatHeader
          title={activeConversation?.title || 'New conversation'}
          selectedModel={selectedModel}
          models={AI_MODELS}
          onModelChange={setSelectedModel}
        />

        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            isStreaming={isStreaming}
            streamingModel={selectedModel}
            messagesEndRef={messagesEndRef}
            typingMessageId={typingMessageId}
            onTypingComplete={() => setTypingMessageId(null)}
          />
        )}

        <ChatInput onSend={handleSendMessage} isStreaming={isStreaming} selectedModel={selectedModel} />
      </div>
    </div>
  );
}
