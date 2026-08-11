'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ConversationSidebar from './ConversationSidebar';
import Icon from '@/components/ui/AppIcon';
import { fetchOrDefaultAiSettings, buildPersonaPrompt } from '@/lib/supabase/ai-settings';
import {
  fetchConversations,
  fetchMessages,
  createConversation,
  saveMessage,
  deleteConversation,
  type ConversationRow,
} from '@/lib/supabase/conversations';
import type { Message, AIModel, Conversation } from './chatTypes';

const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', color: '#10A37F', badge: 'Fast' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', color: '#10A37F', badge: 'Smart' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: '#D97706', badge: 'Best' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', color: '#D97706', badge: null },
  { id: 'gemini-pro', name: 'Gemini 3.6 Flash', provider: 'Google', color: '#4285F4', badge: 'Long ctx' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Groq', color: '#F55036', badge: 'Blazing fast' },
  { id: 'gpt-oss-120b-groq', name: 'GPT-OSS 120B', provider: 'Groq', color: '#F55036', badge: 'Reasoning' },
  { id: 'search-agent', name: 'AI Search Agent', provider: 'CodeMind', color: '#22C55E', badge: '2-step' },
];

function toUiConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    projectName: 'General',
    projectId: 'proj-000',
    lastMessage: row.last_message || 'No messages yet',
    timestamp: row.updated_at,
    messageCount: row.message_count,
    modelId: row.model_id || 'gpt-4o',
    fileCount: 0,
  };
}

export default function ChatWorkspace() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[2]);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
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
    fetchOrDefaultAiSettings()
      .then((settings) => setPersonaPrompt(buildPersonaPrompt(settings)))
      .catch((err) => console.error('Failed to load AI persona settings', err));
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

    try {
      await saveMessage(conv.id, 'user', content, selectedModel.id);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel.id,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          personaPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The AI request failed.');

      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        model: selectedModel.id,
      };

      setMessages((prev) => [...prev, aiResponse]);
      setTypingMessageId(aiResponse.id);
      await saveMessage(conv.id, 'assistant', data.content, selectedModel.id);
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
