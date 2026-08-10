'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AnalysisMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-foreground mt-5 mb-2 first:mt-0 pb-1.5 border-b border-border">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-secondary-foreground leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-4 space-y-1.5 mb-3 text-secondary-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-4 space-y-1.5 mb-3 text-secondary-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className || '');
            if (isBlock) {
              return (
                <pre className="bg-background border border-border rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono text-secondary-foreground">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-muted text-accent px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}