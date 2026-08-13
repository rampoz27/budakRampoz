'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Icon from '@/components/ui/AppIcon';
import CodeBlock from './CodeBlock';
import type { Message, AIModel } from './chatTypes';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
  streamingModel: AIModel;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  // The id of the assistant message that should play the typewriter
  // reveal effect. Every other message renders instantly. Cleared by
  // calling onTypingComplete once the animation finishes.
  typingMessageId?: string | null;
  onTypingComplete?: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
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

const MODEL_NAMES: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'claude-3-5-sonnet': 'Claude 3.5',
  'claude-3-haiku': 'Claude Haiku',
  'gemini-pro': 'Gemini Pro',
  'llama-3.3-70b': 'Llama 3.3 70B',
  'gpt-oss-120b-groq': 'GPT-OSS 120B',
  'search-agent': 'Search Agent',
};

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-secondary-foreground leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-outside ml-4 space-y-1 mb-2 text-secondary-foreground">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-outside ml-4 space-y-1 mb-2 text-secondary-foreground">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-3" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left font-semibold text-foreground px-3 py-2 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-secondary-foreground align-top">{children}</td>
  ),
  code(props: { className?: string; children?: React.ReactNode }) {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className || '');
    if (match) {
      return <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
    }
    return (
      <code className="bg-muted text-accent px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Reveals `fullText` at a roughly constant reading-friendly speed (~250
// chars/sec), like it's being typed live. Very long messages are capped
// at MAX_DURATION_MS so they don't take forever to fully appear.
const REVEAL_CHARS_PER_SEC = 250;
const INTERVAL_MS = 16;
const MAX_DURATION_MS = 4000;

function TypewriterMarkdown({
  fullText,
  onDone,
  onTick,
}: {
  fullText: string;
  onDone: () => void;
  onTick?: () => void;
}) {
  const [visibleChars, setVisibleChars] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setVisibleChars(0);

    // Baseline: constant speed. If that would take longer than the cap,
    // speed up just enough to fit within it instead.
    let chunkSize = Math.max(1, Math.round((REVEAL_CHARS_PER_SEC * INTERVAL_MS) / 1000));
    const estimatedDurationMs = (fullText.length / chunkSize) * INTERVAL_MS;
    if (estimatedDurationMs > MAX_DURATION_MS) {
      chunkSize = Math.max(1, Math.ceil(fullText.length / (MAX_DURATION_MS / INTERVAL_MS)));
    }

    const interval = setInterval(() => {
      setVisibleChars((prev) => {
        const next = Math.min(prev + chunkSize, fullText.length);
        onTick?.();
        if (next >= fullText.length && !doneRef.current) {
          doneRef.current = true;
          clearInterval(interval);
          onDone();
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  return <MarkdownContent content={fullText.slice(0, visibleChars)} />;
}

export default function ChatMessages({
  messages,
  isStreaming,
  streamingModel,
  messagesEndRef,
  typingMessageId,
  onTypingComplete,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
            <Icon name="CodeBracketIcon" size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Start a coding session</h3>
          <p className="text-secondary-foreground text-sm mb-6">
            Ask anything about your code — debugging, architecture, refactoring, or code review.
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            {[
              'Why is my useEffect running twice?',
              'Write a debounce hook in TypeScript',
              'Explain this SQL query',
              'Review my API error handling',
            ].map((prompt) => (
              <button
                key={`prompt-${prompt.slice(0, 20)}`}
                className="text-left bg-muted border border-border rounded-lg p-3 text-xs text-secondary-foreground hover:border-primary/50 hover:text-foreground transition-all duration-150"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
          {message.role === 'assistant' && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
              style={{ backgroundColor: MODEL_COLORS[message.model || 'claude-3-5-sonnet'] || '#7C3AED' }}
            >
              AI
            </div>
          )}

          <div className={`max-w-3xl min-w-0 ${message.role === 'user' ? 'max-w-xl' : 'flex-1'}`}>
            {/* File attachments */}
            {message.files && message.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.files.map((file, fi) => (
                  <div
                    key={`${message.id}-file-${fi}`}
                    className="flex items-center gap-2 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Icon name="DocumentTextIcon" size={14} className="text-accent flex-shrink-0" />
                    <span className="text-foreground font-medium font-mono">{file.name}</span>
                    <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Message bubble */}
            <div className={`rounded-2xl px-4 py-3 ${
              message.role === 'user' ? 'message-user-bubble rounded-tr-sm' : 'message-ai-bubble rounded-tl-sm'
            }`}>
              {message.role === 'assistant' ? (
                message.id === typingMessageId ? (
                  <TypewriterMarkdown
                    fullText={message.content}
                    onDone={() => onTypingComplete?.()}
                    onTick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })}
                  />
                ) : (
                  <MarkdownContent content={message.content} />
                )
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
            </div>

            {/* Meta row */}
            <div className={`flex items-center gap-2 mt-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && message.model && (
                <span
                  className="text-2xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${MODEL_COLORS[message.model]}20`,
                    color: MODEL_COLORS[message.model],
                  }}
                >
                  {MODEL_NAMES[message.model] || message.model}
                </span>
              )}
              <span className="text-2xs text-muted-foreground">
                {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-white">AR</span>
            </div>
          )}
        </div>
      ))}

      {/* Streaming indicator (shown while waiting for the AI's response) */}
      {isStreaming && (
        <div className="flex gap-3 justify-start fade-in">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
            style={{ backgroundColor: MODEL_COLORS[streamingModel.id] || '#7C3AED' }}
          >
            AI
          </div>
          <div className="message-ai-bubble rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary streaming-dot" />
              <span className="w-2 h-2 rounded-full bg-primary streaming-dot" />
              <span className="w-2 h-2 rounded-full bg-primary streaming-dot" />
              <span className="text-xs text-muted-foreground ml-1">{streamingModel.name} is thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
