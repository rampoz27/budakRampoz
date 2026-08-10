'use client';

import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { AIModel } from './chatTypes';

interface ChatHeaderProps {
  title: string;
  selectedModel: AIModel;
  models: AIModel[];
  onModelChange: (model: AIModel) => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const { title, selectedModel, models, onModelChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handlePick(model: AIModel) {
    onModelChange(model);
    setIsOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-background">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
          <Icon name="CodeBracketIcon" size={16} className="text-white" />
        </div>
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      </div>

      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 transition-colors"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedModel.color }}
          />
          <span>{selectedModel.name}</span>
          <Icon name="ChevronDownIcon" size={12} className="text-muted-foreground" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                Select a model
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handlePick(model)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                    selectedModel.id === model.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{model.name}</p>
                      <p className="text-2xs text-muted-foreground truncate">{model.provider}</p>
                    </div>
                  </div>
                  {selectedModel.id === model.id && (
                    <Icon name="CheckIcon" size={14} className="text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}