'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CodeBlockProps {
  code: string;
  language: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  tsx: '#06B6D4',
  ts: '#3178C6',
  typescript: '#3178C6',
  jsx: '#61DAFB',
  js: '#F7DF1E',
  javascript: '#F7DF1E',
  python: '#3776AB',
  py: '#3776AB',
  bash: '#4EAA25',
  sh: '#4EAA25',
  sql: '#E38C00',
  json: '#FFA500',
  css: '#1572B6',
  html: '#E34F26',
  go: '#00ADD8',
  rust: '#DEA584',
  plaintext: '#888',
};

function simpleHighlight(code: string, language: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, lineIdx) => {
    const isComment = line.trim().startsWith('//') || line.trim().startsWith('#');
    const isKeyword = /\b(const|let|var|function|return|import|export|from|default|async|await|if|else|for|while|class|interface|type|extends|implements|new|this|true|false|null|undefined|void|string|number|boolean)\b/.test(line);

    return (
      <div key={`line-${lineIdx}`} className="flex">
        <span className="select-none text-muted-foreground w-8 text-right pr-3 flex-shrink-0 text-xs leading-6">
          {lineIdx + 1}
        </span>
        <span
          className={`flex-1 leading-6 ${
            isComment ? 'text-muted-foreground italic' : isKeyword ? 'text-foreground' : 'text-secondary-foreground'
          }`}
        >
          {line || ' '}
        </span>
      </div>
    );
  });
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langColor = LANGUAGE_COLORS[language.toLowerCase()] || '#888';

  return (
    <div className="rounded-xl border border-border overflow-hidden my-2 bg-background">
      {/* Code header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
          <span className="text-xs font-semibold font-mono" style={{ color: langColor }}>
            {language.toUpperCase()}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-150 ${
            copied
              ? 'text-positive bg-positive/10' :'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Copy code to clipboard"
        >
          <Icon name={copied ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={13} />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto">
        <pre className="text-xs font-mono p-3 leading-6 min-w-0">
          <code>{simpleHighlight(code, language)}</code>
        </pre>
      </div>
    </div>
  );
}