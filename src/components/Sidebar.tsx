'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { fetchConversations, type ConversationRow } from '@/lib/supabase/conversations';
import { fetchProjects } from '@/lib/supabase/projects';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeRoute?: string;
}

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { href: '/ai-chat-interface', label: 'AI Chat', icon: 'ChatBubbleLeftRightIcon', badge: null },
      { href: '/projects-conversation-history', label: 'Projects', icon: 'FolderIcon', badge: null },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/file-analysis', label: 'File Analysis', icon: 'DocumentMagnifyingGlassIcon', badge: null },
      { href: '/code-snippets', label: 'Code Snippets', icon: 'CodeBracketIcon', badge: null },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings', label: 'Settings', icon: 'Cog6ToothIcon', badge: null },
    ],
  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Sidebar({ collapsed, onToggleCollapse, activeRoute }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationRow[]>([]);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  useEffect(() => {
    fetchConversations(4)
      .then(setRecentConversations)
      .catch(() => setRecentConversations([]));

    fetchProjects()
      .then((rows) => setProjectCount(rows.length))
      .catch(() => setProjectCount(null));
  }, []);

  return (
    <aside
      className="flex flex-col h-full bg-card border-r border-border sidebar-transition flex-shrink-0 relative z-20"
      style={{ width: collapsed ? '64px' : '280px' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size={28} />
          {!collapsed && (
            <span className="font-semibold text-base text-foreground truncate tracking-tight">
              Rampoz AI Agent
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 flex-shrink-0"
            title="Collapse sidebar"
          >
            <Icon name="ChevronLeftIcon" size={16} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3 flex-shrink-0">
        <Link
          href="/ai-chat-interface"
          className={`flex items-center gap-2.5 rounded-lg transition-all duration-150 font-medium text-sm bg-gradient-primary text-white hover:opacity-90 active:scale-95 ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
          title="New Chat"
        >
          <Icon name="PlusIcon" size={16} />
          {!collapsed && <span>New Chat</span>}
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {navGroups.map((group) => (
          <div key={`group-${group.label}`} className="mb-4">
            {!collapsed && (
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1.5 mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = activeRoute === item.href;
              return (
                <Link
                  key={`nav-${item.href}-${item.label}`}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 mb-0.5 text-sm nav-item-hover relative ${
                    isActive
                      ? 'nav-item-active' :'text-secondary-foreground'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.href === '/projects-conversation-history' && projectCount !== null && projectCount > 0 && (
                        <span className="text-2xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
                          {projectCount}
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-2xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && hoveredItem === item.label && (
                    <div className="absolute left-full ml-2 z-50 bg-secondary border border-border text-foreground text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Recent Conversations */}
        {!collapsed && recentConversations.length > 0 && (
          <div>
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1.5 mb-1">
              Recent
            </p>
            {recentConversations.map((conv) => (
              <Link
                key={conv.id}
                href="/ai-chat-interface"
                className="flex items-start gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground nav-item-hover hover:text-foreground mb-0.5"
              >
                <Icon name="ChatBubbleLeftIcon" size={14} className="flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-secondary-foreground">{conv.title}</p>
                  <p className="truncate text-muted-foreground">{timeAgo(conv.updated_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: User Profile */}
      <div className="border-t border-border p-3 flex-shrink-0">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            title="Expand sidebar"
          >
            <Icon name="ChevronRightIcon" size={16} />
          </button>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg p-1.5 -m-1.5 hover:bg-muted transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Icon name="UserIcon" size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Account</p>
              <p className="text-xs text-muted-foreground truncate">View settings</p>
            </div>
            <Icon name="EllipsisHorizontalIcon" size={16} className="text-muted-foreground flex-shrink-0" />
          </Link>
        )}
      </div>
    </aside>
  );
}
