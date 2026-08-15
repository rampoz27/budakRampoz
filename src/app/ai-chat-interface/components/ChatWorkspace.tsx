'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationSidebar from './ConversationSidebar';
import Icon from '@/components/ui/AppIcon';
import {
  fetchPersonaForModel,
  DEFAULT_PERSONA,
  fetchAllNicknames,
} from '@/lib/supabase/ai-settings';
import { detectAddressedModel } from '@/lib/model-address';
import {
  findRelevantNotes,
  hasAnyNotes,
  createNote,
  deleteNote,
  updateNote,
  searchNotesByText,
} from '@/lib/supabase/notes';
import { mightBeNoteCommand, classifyNoteIntent, type NoteIntentResult } from '@/lib/note-trigger';
import { mightBeJobdeskCommand } from '@/lib/jobdesk-trigger';
import { mightBeStartShiftCommand } from '@/lib/shift-trigger';
import { mightBeAlarmCommand } from '@/lib/alarm-trigger';
import { mightBeAccountCommand } from '@/lib/account-trigger';
import { mightBeAccountVerifyCommand, extractCandidateNumbers } from '@/lib/account-verify-trigger';
import { createAlarm } from '@/lib/supabase/alarms';
import {
  fetchActiveBankAccounts,
  fetchBankAccounts,
  hasAnyActiveAccounts,
  createBankAccount,
  tokenizeAccountsForContext,
  detokenizeAccountRefs,
} from '@/lib/supabase/bank-accounts';
import {
  fetchActiveShiftSession,
  updateSessionTasks,
  fetchShiftTemplates,
  findTemplatesForCurrentTime,
  startShiftSession,
} from '@/lib/supabase/shifts';
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

// Executes a classified note command and returns the confirmation text to
// show in chat. Kept outside the component since it doesn't touch React
// state directly — just Supabase calls and plain logic.
async function handleNoteCommand(
  intent: NoteIntentResult,
  lastAssistantContent: string | undefined
): Promise<string> {
  if (intent.action === 'add') {
    const noteContent = intent.content || lastAssistantContent || '';
    if (!noteContent.trim()) {
      return "I don't have anything to save yet — either write what to save after your command (e.g. \"tambahkan ke note: ...\"), or ask something first so there's a reply to save.";
    }
    const title = noteContent.trim().split('\n')[0].slice(0, 60) || 'Untitled note';
    await createNote({ title, content: noteContent.trim(), tags: ['from-chat'] });
    return `✅ Saved to your notes: **"${title}"**`;
  }

  if (intent.action === 'delete') {
    if (!intent.target.trim()) {
      return 'Which note should I delete? Try something like "hapus note supabase".';
    }
    const matches = await searchNotesByText(intent.target.trim());
    if (matches.length === 0) {
      return `I couldn't find a note matching "${intent.target}".`;
    }
    if (matches.length > 1) {
      const list = matches.map((m) => `- "${m.title}"`).join('\n');
      return `Found more than one note matching "${intent.target}" — be more specific:\n\n${list}`;
    }
    const note = matches[0];
    const confirmed = confirm(`Delete note "${note.title}"? This cannot be undone.`);
    if (!confirmed) return 'Cancelled — the note was not deleted.';
    await deleteNote(note.id);
    return `🗑️ Deleted note: **"${note.title}"**`;
  }

  if (intent.action === 'edit') {
    if (!intent.target.trim()) {
      return 'Which note should I edit? Try something like "edit note supabase: new content here".';
    }
    if (!intent.content.trim()) {
      return `Found the note you mean, but I need the new content too — try "edit note ${intent.target}: <new content>".`;
    }
    const matches = await searchNotesByText(intent.target.trim());
    if (matches.length === 0) {
      return `I couldn't find a note matching "${intent.target}".`;
    }
    if (matches.length > 1) {
      const list = matches.map((m) => `- "${m.title}"`).join('\n');
      return `Found more than one note matching "${intent.target}" — be more specific:\n\n${list}`;
    }
    const note = matches[0];
    await updateNote(note.id, { title: note.title, content: intent.content.trim(), tags: note.tags });
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
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
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
    hasAnyActiveAccounts()
      .then(setHasAccounts)
      .catch((err) => console.error('Failed to check for accounts', err));
    fetchAllNicknames()
      .then(setNicknames)
      .catch((err) => console.error('Failed to load model nicknames', err));
  }, [loadConversations]);

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

      // Old assistant messages may still contain {{ACC-xxxxxxxx}} tokens
      // — swap them back to real numbers for display, same as freshly
      // received responses.
      const accountsForDisplay = hasAccounts ? await fetchActiveBankAccounts().catch(() => []) : [];

      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role,
          content:
            r.role === 'assistant' && accountsForDisplay.length > 0
              ? detokenizeAccountRefs(r.content, accountsForDisplay)
              : r.content,
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

    // "gemini, ..." / "llama: ..." — lets a single message override which
    // model answers, regardless of the dropdown. Computed early so it's
    // consistent even for the very first message of a new conversation.
    const addressedModel = detectAddressedModel(content, AI_MODELS, nicknames);
    const effectiveModel = addressedModel || selectedModel;
    if (addressedModel && addressedModel.id !== selectedModel.id) {
      setSelectedModel(addressedModel); // keep the dropdown in sync going forward
    }

    // Lazily create the conversation on the first message, like ChatGPT/Claude do.
    if (!conv) {
      try {
        const title = content.trim().slice(0, 60) || 'New conversation';
        conv = await createConversation(title, effectiveModel.id);
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
    // note...") are handled entirely locally — but only after confirming
    // real intent, since a plain keyword match can't tell a command
    // ("tambahkan ke note: ...") apart from a question that merely
    // mentions notes ("udah ketambah note belum?").
    if (mightBeNoteCommand(content)) {
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
      const intent = await classifyNoteIntent(content, lastAssistantMsg?.content);

      if (intent.action !== 'none') {
        try {
          await saveMessage(conv.id, 'user', content, effectiveModel.id);

          const confirmationText = await handleNoteCommand(intent, lastAssistantMsg?.content);

          // Fixes a stale-state bug: hasNotes is only checked once on
          // mount, so if the user had zero notes when the page loaded and
          // just created their first one via this chat command, hasNotes
          // would otherwise stay "false" for the rest of the session —
          // silently skipping the RAG lookup on every later message.
          if (intent.action === 'add' && confirmationText.startsWith('✅')) {
            setHasNotes(true);
          }

          const confirmationMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: confirmationText,
            timestamp: new Date().toISOString(),
            model: effectiveModel.id,
          };

          setMessages((prev) => [...prev, confirmationMsg]);
          await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
          await loadConversations();
        } catch (err) {
          const errorMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `⚠️ ${err instanceof Error ? err.message : 'Failed to save note.'}`,
            timestamp: new Date().toISOString(),
            model: effectiveModel.id,
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsStreaming(false);
        }
        return;
      }
      // intent.action === 'none' — it just mentioned notes, wasn't a
      // command. Fall through to the normal chat flow below.
    }

    // "ingatkan aku...", "reminder...", "alarm jam..." — the LLM resolves
    // the (possibly relative) time expression, we set an alarm.
    if (mightBeAlarmCommand(content)) {
      try {
        const classifyRes = await fetch('/api/classify-alarm-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, currentDateTime: new Date().toString() }),
        });
        const classification = await classifyRes.json();

        if (classification.action === 'set_alarm' && classification.alarmDateTime) {
          const alarmDate = new Date(classification.alarmDateTime);

          if (!Number.isNaN(alarmDate.getTime()) && alarmDate.getTime() > Date.now()) {
            await saveMessage(conv.id, 'user', content, effectiveModel.id);

            const label = classification.label || content;
            await createAlarm({
              label,
              alarm_time: alarmDate.toISOString(),
            });

            const confirmationText = `⏰ Alarm diset: **${label}**\npada ${alarmDate.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}.`;

            const confirmationMsg: Message = {
              id: `msg-${Date.now() + 1}`,
              role: 'assistant',
              content: confirmationText,
              timestamp: new Date().toISOString(),
              model: effectiveModel.id,
            };
            setMessages((prev) => [...prev, confirmationMsg]);
            await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
            setIsStreaming(false);
            return;
          }
        }
        // action === 'none', or the time couldn't be resolved to a valid
        // future datetime — fall through to the normal chat flow below.
      } catch (err) {
        console.error('Alarm command handling failed, continuing as normal chat', err);
      }
    }

    // "cocokkan rekening ini...", "verifikasi rekening..." — checks
    // pasted numbers against the REAL stored numbers directly (no LLM
    // involved), since the AI itself never sees real account digits and
    // can't reliably do this comparison.
    if (mightBeAccountVerifyCommand(content)) {
      const candidates = extractCandidateNumbers(content);
      if (candidates.length > 0) {
        try {
          await saveMessage(conv.id, 'user', content, effectiveModel.id);

          const allAccounts = await fetchBankAccounts();
          const results = candidates.map((num) => {
            const normalized = num.replace(/\D/g, '');
            const match = allAccounts.find((a) => a.account_number.replace(/\D/g, '') === normalized);
            return { number: num, match };
          });

          const lines = results.map((r) =>
            r.match
              ? `✅ ${r.number} — cocok: **${r.match.bank_name} — ${r.match.account_holder_name}** (${r.match.status === 'active' ? 'Aktif' : 'Di offkan'})`
              : `❌ ${r.number} — tidak ditemukan di data kami`
          );

          const confirmationText = `Hasil verifikasi (dicek langsung ke data asli, bukan lewat AI):\n\n${lines.join('\n')}`;

          const confirmationMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: confirmationText,
            timestamp: new Date().toISOString(),
            model: effectiveModel.id,
          };
          setMessages((prev) => [...prev, confirmationMsg]);
          await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
          setIsStreaming(false);
          return;
        } catch (err) {
          console.error('Account verification failed', err);
          setIsStreaming(false);
          return;
        }
      }
      // No digit sequences found — fall through to the normal chat flow.
    }

    // "tambahkan rekening BCA atas nama...", "simpan rekening..." — the
    // LLM extracts bank/name/number from natural phrasing, no need to
    // open the Rekening page and fill a form.
    if (mightBeAccountCommand(content)) {
      try {
        const classifyRes = await fetch('/api/classify-account-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });
        const classification = await classifyRes.json();
        const accountsToAdd: Array<{ bankName: string; holderName: string; accountNumber: string }> =
          classification.accounts ?? [];

        if (classification.action === 'add' && accountsToAdd.length > 0) {
          await saveMessage(conv.id, 'user', content, effectiveModel.id);

          // Batch insert — independent rows, so run them concurrently
          // instead of one at a time.
          await Promise.all(
            accountsToAdd.map((acc) =>
              createBankAccount({
                bank_name: acc.bankName,
                account_holder_name: acc.holderName,
                account_number: acc.accountNumber,
                screenshot_url: '',
                status: 'active',
              })
            )
          );

          // Fixes the same stale-state issue we hit with hasNotes: update
          // immediately so this session's RAG-style lookup picks up the
          // new account(s) on the very next message, not just after reload.
          setHasAccounts(true);

          const confirmationText =
            accountsToAdd.length === 1
              ? `✅ Rekening disimpan: **${accountsToAdd[0].bankName} — ${accountsToAdd[0].holderName} — ${accountsToAdd[0].accountNumber}**`
              : `✅ ${accountsToAdd.length} rekening disimpan:\n\n${accountsToAdd
                  .map((a) => `- ${a.bankName} — ${a.holderName} — ${a.accountNumber}`)
                  .join('\n')}`;

          const confirmationMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: confirmationText,
            timestamp: new Date().toISOString(),
            model: effectiveModel.id,
          };
          setMessages((prev) => [...prev, confirmationMsg]);
          await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
          setIsStreaming(false);
          return;
        }
        // action === 'none', or nothing usable was extracted — fall
        // through to the normal chat flow below.
      } catch (err) {
        console.error('Account command handling failed, continuing as normal chat', err);
      }
    }

    // "mulai shift" / "start shift" — auto-picks the template whose time
    // range covers right now (e.g. Pagi 08:00–20:00, Malam 20:00–08:00)
    // and starts it, no need to open the Shifts page.
    if (mightBeStartShiftCommand(content)) {
      try {
        const existingSession = await fetchActiveShiftSession();

        let confirmationText: string;

        if (existingSession) {
          confirmationText = `Kamu udah lagi di **${existingSession.shift_name}** sekarang — akhirin dulu shift itu sebelum mulai yang baru.`;
        } else {
          const templates = await fetchShiftTemplates();
          const matches = findTemplatesForCurrentTime(templates);

          if (matches.length === 0) {
            const list =
              templates.length > 0
                ? templates.map((t) => `- ${t.name} (${t.start_time || '?'}–${t.end_time || '?'})`).join('\n')
                : '(belum ada template shift sama sekali — bikin dulu di halaman Shift)';
            confirmationText = `Nggak ada template shift yang jamnya cocok sama sekarang. Template yang ada:\n\n${list}\n\nBuka halaman Shift buat mulai manual, atau atur jam template-nya dulu.`;
          } else if (matches.length > 1) {
            const list = matches.map((t) => `- ${t.name} (${t.start_time}–${t.end_time})`).join('\n');
            confirmationText = `Ada beberapa template yang jamnya overlap sama sekarang, sebutin salah satu:\n\n${list}`;
          } else {
            const session = await startShiftSession(matches[0]);
            confirmationText = `✅ **${session.shift_name}** dimulai (${matches[0].start_time}–${matches[0].end_time}). Ada ${session.tasks.length} jobdesk buat shift ini.`;
          }
        }

        await saveMessage(conv.id, 'user', content, effectiveModel.id);

        const confirmationMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: confirmationText,
          timestamp: new Date().toISOString(),
          model: effectiveModel.id,
        };
        setMessages((prev) => [...prev, confirmationMsg]);
        await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
        setIsStreaming(false);
        return;
      } catch (err) {
        console.error('Start-shift command failed', err);
        setIsStreaming(false);
        return;
      }
    }

    // Jobdesk commands ("selesai jobdesk...", "checklist tugas...") —
    // only relevant if there's an active shift with tasks to match against.
    if (mightBeJobdeskCommand(content)) {
      try {
        const activeSession = await fetchActiveShiftSession();

        if (activeSession) {
          const incompleteTasks = activeSession.tasks.filter((t) => !t.done);

          if (incompleteTasks.length > 0) {
            const classifyRes = await fetch('/api/classify-jobdesk-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: content,
                tasks: incompleteTasks.map((t) => ({ id: t.id, text: t.text })),
              }),
            });
            const classification = await classifyRes.json();

            if (classification.action === 'complete' && classification.taskIds?.length > 0) {
              await saveMessage(conv.id, 'user', content, effectiveModel.id);

              const matchedIds: string[] = classification.taskIds;
              const updatedTasks = activeSession.tasks.map((t) =>
                matchedIds.includes(t.id)
                  ? { ...t, done: true, done_by: 'ai' as const, done_at: new Date().toISOString() }
                  : t
              );
              await updateSessionTasks(activeSession.id, updatedTasks);

              const matchedTexts = activeSession.tasks
                .filter((t) => matchedIds.includes(t.id))
                .map((t) => `✅ ${t.text}`)
                .join('\n');
              const confirmationText = `Ditandai selesai:\n\n${matchedTexts}`;

              const confirmationMsg: Message = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: confirmationText,
                timestamp: new Date().toISOString(),
                model: effectiveModel.id,
              };
              setMessages((prev) => [...prev, confirmationMsg]);
              await saveMessage(conv.id, 'assistant', confirmationText, effectiveModel.id);
              setIsStreaming(false);
              return;
            }
          }
        }
        // No active shift, no incomplete tasks, or classification said
        // "none" — fall through to the normal chat flow below.
      } catch (err) {
        console.error('Jobdesk command handling failed, continuing as normal chat', err);
      }
    }

    try {
      // saveMessage, the note lookup, and the persona lookup for whichever
      // model actually answers this turn don't depend on each other, so
      // run them concurrently instead of one after another. Fetching
      // persona fresh here (rather than trusting stale state) matters
      // when a message addresses a different model than the one currently
      // selected — that state hasn't caught up yet.
      const notesLookup = hasNotes
        ? findRelevantNotes(content).catch((err) => {
            console.error('Note lookup failed, continuing without it', err);
            return [];
          })
        : Promise.resolve([]);

      const personaLookup = fetchPersonaForModel(effectiveModel.id).catch((err) => {
        console.error('Persona lookup failed, using defaults', err);
        return DEFAULT_PERSONA;
      });

      const shiftLookup = fetchActiveShiftSession().catch((err) => {
        console.error('Shift lookup failed, continuing without it', err);
        return null;
      });

      const accountsLookup = hasAccounts
        ? fetchActiveBankAccounts().catch((err) => {
            console.error('Account lookup failed, continuing without it', err);
            return [];
          })
        : Promise.resolve([]);

      const [, relevantNotes, personaSettings, activeShift, activeAccounts] = await Promise.all([
        saveMessage(conv.id, 'user', content, effectiveModel.id),
        notesLookup,
        personaLookup,
        shiftLookup,
        accountsLookup,
      ]);

      const ragContext =
        relevantNotes.length > 0
          ? relevantNotes.map((n) => `Note: "${n.title}"\n${n.content}`).join('\n\n---\n\n')
          : '';

      const shiftContext = activeShift
        ? `Shift: ${activeShift.shift_name} (started ${new Date(activeShift.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })})\nJobdesk status:\n${activeShift.tasks
            .map((t) => `${t.done ? '✅' : '❌'} ${t.text}${t.done && t.done_by ? ` (checked by ${t.done_by})` : ''}`)
            .join('\n')}`
        : '';

      // The AI only ever sees {{ACC-xxxxxxxx}} reference codes here, never
      // the real account numbers — see tokenizeAccountsForContext.
      const accountsContext =
        activeAccounts.length > 0 ? tokenizeAccountsForContext(activeAccounts) : '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: effectiveModel.id,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          personaSettings,
          ragContext,
          shiftContext,
          accountsContext,
          // Browser's local time — naturally already in the user's own
          // timezone, no conversion needed.
          currentDateTime: new Date().toString(),
        }),
      });

      // search-agent still returns a single JSON blob (multi-step
      // pipeline, not stream-friendly) — everything else is real SSE.
      if (effectiveModel.id === 'search-agent') {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'The AI request failed.');

        const displayContent =
          activeAccounts.length > 0 ? detokenizeAccountRefs(data.content, activeAccounts) : data.content;

        const aiResponse: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: displayContent,
          timestamp: new Date().toISOString(),
          model: effectiveModel.id,
        };

        setMessages((prev) => [...prev, aiResponse]);
        setTypingMessageId(aiResponse.id); // keep the typewriter reveal just for this one
        await saveMessage(conv.id, 'assistant', data.content, effectiveModel.id);
        await loadConversations();
        return;
      }

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'The AI request failed.');
      }

      // ── Real SSE streaming: read chunks as they arrive and grow the
      //    message in place. No fake typewriter timer needed — the
      //    network itself is what's "typing".
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawAccumulated = ''; // raw, still-tokenized text — this is what gets saved to DB
      let finalModelId = effectiveModel.id;
      let streamError: string | null = null;
      let streamStarted = false;
      const streamingMsgId = `msg-${Date.now() + 1}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;

          let evt: { type?: string; text?: string; actualModelId?: string; message?: string };
          try {
            evt = JSON.parse(dataStr);
          } catch {
            continue; // ignore a malformed/partial SSE line
          }

          if (evt.type === 'chunk' && evt.text) {
            rawAccumulated += evt.text;
            // Detokenize the WHOLE accumulated text on every update — a
            // token split across two chunks just won't match the regex
            // yet, and resolves automatically the moment it completes.
            const displayText =
              activeAccounts.length > 0 ? detokenizeAccountRefs(rawAccumulated, activeAccounts) : rawAccumulated;

            if (!streamStarted) {
              streamStarted = true;
              setIsStreaming(false); // swap the "thinking..." dots for the real growing bubble
              setMessages((prev) => [
                ...prev,
                {
                  id: streamingMsgId,
                  role: 'assistant',
                  content: displayText,
                  timestamp: new Date().toISOString(),
                  model: effectiveModel.id,
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === streamingMsgId ? { ...m, content: displayText } : m))
              );
            }
          } else if (evt.type === 'done' && evt.actualModelId) {
            finalModelId = evt.actualModelId;
          } else if (evt.type === 'error' && evt.message) {
            streamError = evt.message;
          }
        }
      }

      if (streamError) throw new Error(streamError);

      // Fallback note, if a different model ended up answering — decided
      // only now that we know the final actualModelId.
      const fallbackNote =
        finalModelId !== effectiveModel.id
          ? `_Note: the model you selected was rate-limited, so this reply came from **${finalModelId}** instead._\n\n`
          : '';

      const finalDisplayText =
        fallbackNote +
        (activeAccounts.length > 0 ? detokenizeAccountRefs(rawAccumulated, activeAccounts) : rawAccumulated);
      const finalRawText = fallbackNote + rawAccumulated; // what gets saved to DB — still tokenized

      setMessages((prev) =>
        prev.map((m) => (m.id === streamingMsgId ? { ...m, content: finalDisplayText, model: finalModelId } : m))
      );

      await saveMessage(conv.id, 'assistant', finalRawText, finalModelId);
      await loadConversations();
    } catch (err) {
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong reaching the AI.'}`,
        timestamp: new Date().toISOString(),
        model: effectiveModel.id,
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
