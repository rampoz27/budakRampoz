import type { Message, Conversation, Project } from './chatTypes';

export const mockMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: "I'm getting a hydration error in my Next.js 15 app. The error says: `Error: Hydration failed because the initial UI does not match what was rendered on the server.` Here's my component:",
    timestamp: '2026-08-10T09:14:22Z',
    files: [{ name: 'DashboardPage.tsx', size: 4821, type: 'text/plain' }],
  },
  {
    id: 'msg-002',
    role: 'assistant',
    content: `This is a classic Next.js hydration mismatch — and it's very common when using dynamic values in server components. Let me analyze your file.

The problem is almost certainly one of these patterns in your \`DashboardPage.tsx\`:

\`\`\`tsx
// Common culprits in your file:

// 1. Date rendering without stable format
<span>{new Date().toLocaleDateString()}</span>

// 2. Math.random() in keys or values  
key={Math.random()}

// 3. Browser-only APIs in render
const width = window.innerWidth;
\`\`\`

**Quick diagnosis:** Add this to the top of your component temporarily:

\`\`\`bash
# Run with verbose hydration errors
NEXT_PUBLIC_DEBUG_HYDRATION=true npm run dev
\`\`\`

Then check the console — Next.js 15 shows the exact DOM node that mismatched. Share the output and I can pinpoint it exactly.`,
    timestamp: '2026-08-10T09:14:55Z',
    model: 'claude-3-5-sonnet',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: "Here's the relevant part of the component that's causing the issue:",
    timestamp: '2026-08-10T09:17:30Z',
    files: [{ name: 'MetricsCard.tsx', size: 1243, type: 'text/plain' }],
  },
  {
    id: 'msg-004',
    role: 'assistant',
    content: `Found it! Looking at \`MetricsCard.tsx\`, the issue is on line 23. You're calling \`Date.now()\` directly in JSX render:

\`\`\`tsx
// ❌ Your current code (causes hydration mismatch)
export function MetricsCard({ value }: { value: number }) {
  return (
    <div>
      <span className="text-sm text-gray-500">
        Last updated: {new Date(Date.now()).toLocaleString()}
      </span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
\`\`\`

Here's the correct pattern:

\`\`\`tsx
// ✅ Fixed version
'use client';
import { useState, useEffect } from 'react';

export function MetricsCard({ value, updatedAt }: { 
  value: number;
  updatedAt: string; // Pass as ISO string from server
}) {
  const [formattedDate, setFormattedDate] = useState('');
  
  useEffect(() => {
    // Only runs on client — no hydration mismatch
    setFormattedDate(
      new Date(updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        hour: '2-digit',
        minute: '2-digit'
      })
    );
  }, [updatedAt]);
  
  return (
    <div>
      <span className="text-sm text-gray-500">
        Last updated: {formattedDate || '—'}
      </span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}
\`\`\`

**Why this works:** The server renders \`'—'\` as the placeholder. After hydration, \`useEffect\` fires and sets the real formatted date — both render the same initial HTML, eliminating the mismatch.

I also added \`tabular-nums\` to the value — this prevents layout shift when numbers update. Want me to refactor the full \`DashboardPage.tsx\` with this pattern applied everywhere?`,
    timestamp: '2026-08-10T09:18:12Z',
    model: 'claude-3-5-sonnet',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Fix React hydration error',
    projectName: 'E-Commerce Frontend',
    projectId: 'proj-001',
    lastMessage: 'Want me to refactor the full DashboardPage.tsx?',
    timestamp: '2026-08-10T09:18:12Z',
    messageCount: 8,
    modelId: 'claude-3-5-sonnet',
    fileCount: 2,
  },
  {
    id: 'conv-002',
    title: 'PostgreSQL query optimization',
    projectName: 'Analytics API',
    projectId: 'proj-002',
    lastMessage: 'Add a composite index on (user_id, created_at)',
    timestamp: '2026-08-09T16:44:00Z',
    messageCount: 12,
    modelId: 'gpt-4o',
    fileCount: 1,
  },
  {
    id: 'conv-003',
    title: 'Auth middleware TypeScript types',
    projectName: 'SaaS Boilerplate',
    projectId: 'proj-003',
    lastMessage: 'Use a discriminated union for the auth result',
    timestamp: '2026-08-09T11:22:00Z',
    messageCount: 6,
    modelId: 'claude-3-5-sonnet',
    fileCount: 0,
  },
  {
    id: 'conv-004',
    title: 'Docker multi-stage build',
    projectName: 'DevOps Config',
    projectId: 'proj-004',
    lastMessage: 'Final image size reduced from 1.2GB to 180MB',
    timestamp: '2026-08-08T14:05:00Z',
    messageCount: 9,
    modelId: 'gpt-4-turbo',
    fileCount: 3,
  },
  {
    id: 'conv-005',
    title: 'Implement rate limiting middleware',
    projectName: 'Analytics API',
    projectId: 'proj-002',
    lastMessage: 'Using sliding window algorithm with Redis',
    timestamp: '2026-08-07T20:31:00Z',
    messageCount: 5,
    modelId: 'deepseek-coder',
    fileCount: 1,
  },
  {
    id: 'conv-006',
    title: 'Zustand vs Redux Toolkit',
    projectName: 'E-Commerce Frontend',
    projectId: 'proj-001',
    lastMessage: 'For your use case, Zustand is the better choice',
    timestamp: '2026-08-07T09:15:00Z',
    messageCount: 14,
    modelId: 'claude-3-5-sonnet',
    fileCount: 0,
  },
];

export const mockProjects: Project[] = [
  { id: 'proj-001', name: 'E-Commerce Frontend', conversationCount: 8, color: '#7C3AED' },
  { id: 'proj-002', name: 'Analytics API', conversationCount: 5, color: '#06B6D4' },
  { id: 'proj-003', name: 'SaaS Boilerplate', conversationCount: 3, color: '#10B981' },
  { id: 'proj-004', name: 'DevOps Config', conversationCount: 4, color: '#F59E0B' },
];