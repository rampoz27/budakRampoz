'use client';

import React, { useState, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { AIModel } from './chatTypes';

interface ChatInputProps {
  onSend: (content: string, files: File[]) => void;
  isStreaming: boolean;
  selectedModel: AIModel;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

export default function ChatInput(props: ChatInputProps) {
  const { onSend, isStreaming, selectedModel } = props;
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (content.trim().length > 0 || files.length > 0) && !isStreaming;

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }

  function handleSend() {
    if (!canSend) return;
    onSend(content.trim(), files);
    setContent('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-background">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, i) => (
            <div
              key={file.name + '-' + i}
              className="flex items-center gap-2 bg-muted border border-border rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs"
            >
              <Icon name="DocumentTextIcon" size={14} className="text-accent flex-shrink-0" />
              <span className="text-foreground font-medium truncate max-w-[10rem]">{file.name}</span>
              <span className="text-muted-foreground flex-shrink-0">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
              >
                <Icon name="XMarkIcon" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-muted border border-border rounded-2xl px-3 py-2 focus-within:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-border transition-colors flex-shrink-0"
        >
          <Icon name="PaperClipIcon" size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={'Message ' + selectedModel.name + '...'}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder-muted-foreground py-1 max-h-[200px] leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={
            'p-1.5 rounded-lg flex-shrink-0 transition-colors ' +
            (canSend
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-border text-muted-foreground cursor-not-allowed')
          }
        >
          <Icon name="PaperAirplaneIcon" size={16} />
        </button>
      </div>

      <p className="text-2xs text-muted-foreground mt-1.5 px-1">
        Press Enter to send, Shift + Enter for a new line
      </p>
    </div>
  );
}