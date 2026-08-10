'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { Conversation, AIModel } from './chatTypes';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  models: AIModel[];
}

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o': '#10A37F',
  'gpt-4-turbo': '#10A37F',
  'claude-3-5-sonnet': '#D97706',
  'claude-3-haiku': '#D97706',
  'gemini-pro': '#4285F4',
  'llama-3.3-70b': '#F55036',
  'gpt-oss-120b-groq': '#F55036',
  'search-agent': '#22C55E',
};

const MODEL_SHORT: Record<string, string> = {
  'gpt-4o': 'GPT',
  'gpt-4-turbo': 'GPT',
  'claude-3-5-sonnet': 'CLD',
  'claude-3-haiku': 'CLD',
  'gemini-pro': 'GEM',
  'llama-3.3-70b': 'LLM',
  'gpt-oss-120b-groq': 'OSS',
  'search-agent': 'SRCH',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  models: _models,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.projectName.toLowerCase().includes(search.toLowerCase())
  );

  function handleDeleteClick(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation();
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      onDelete(id);
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col border-r border-border bg-card/50 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 text-muted-foreground hover:text-foreground transition-colors"
          title="Expand conversations"
        >
          <Icon name="ChevronRightIcon" size={16} />
        </button>
        <button
          onClick={onNewChat}
          className="mx-2 mb-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="New chat"
        >
          <Icon name="PlusIcon" size={16} />
        </button>
        <div className="flex flex-col gap-1 px-2 py-2">
          {filtered.slice(0, 8).map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              title={conv.title}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-2xs font-bold transition-all duration-150 ${
                activeId === conv.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {conv.title[0]?.toUpperCase() || '?'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 flex flex-col border-r border-border bg-card/50 flex-shrink-0 overflow-hidden sidebar-transition">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
        <div className="flex-1 relative">
          <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 flex-shrink-0"
          title="Collapse conversation list"
        >
          <Icon name="ChevronLeftIcon" size={14} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          <Icon name="PlusIcon" size={14} />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="ChatBubbleLeftRightIcon" size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {conversations.length === 0 ? 'No conversations yet' : 'No conversations found'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(conv.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(conv.id)}
              className={`group w-full text-left px-3 py-2.5 transition-all duration-150 border-l-2 cursor-pointer ${
                activeId === conv.id
                  ? 'bg-primary/10 border-primary' :'border-transparent hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-primary/60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-xs font-semibold truncate ${activeId === conv.id ? 'text-primary' : 'text-foreground'}`}>
                      {conv.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-2xs text-muted-foreground group-hover:hidden">
                        {timeAgo(conv.timestamp)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteClick(e, conv.id, conv.title)}
                        className="hidden group-hover:flex p-1 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                        title="Delete conversation"
                      >
                        <Icon name="TrashIcon" size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-2xs text-secondary-foreground truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-2xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${MODEL_COLORS[conv.modelId] || '#7C3AED'}20`,
                        color: MODEL_COLORS[conv.modelId] || '#7C3AED',
                      }}
                    >
                      {MODEL_SHORT[conv.modelId] || 'AI'}
                    </span>
                    <span className="text-2xs text-muted-foreground">{conv.messageCount} msgs</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}