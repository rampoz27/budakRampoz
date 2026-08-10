'use client';

import React, { useState, useEffect } from 'react';
import AppLogo from '@/components/ui/AppLogo';

const features = [
  {
    icon: '⚡',
    title: 'Multi-Model AI',
    desc: 'Switch between GPT-4o, Claude 3.5, Gemini Pro, and more',
  },
  {
    icon: '📁',
    title: 'File-Aware Context',
    desc: 'Upload code files and let AI analyze your exact codebase',
  },
  {
    icon: '🗂️',
    title: 'Project Organization',
    desc: 'Keep conversations organized by project and folder',
  },
  {
    icon: '💻',
    title: 'Syntax Highlighting',
    desc: 'Beautiful code blocks with copy-to-clipboard for 40+ languages',
  },
];

const codeDecoration = `// Fix: React hydration mismatch
function useIsClient() {
  const [isClient, setIsClient] = 
    useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
}

export const DynamicContent = () => {
  const isClient = useIsClient();
  if (!isClient) return <Skeleton />;
  return <RealContent />;
};`;

export default function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex w-[520px] xl:w-[600px] flex-col auth-brand-bg border-r border-border relative overflow-hidden flex-shrink-0">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60" />
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />
      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <AppLogo size={36} />
          <span className="font-bold text-xl text-foreground tracking-tight">CodeMind</span>
          <span className="text-2xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
            BETA
          </span>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-tight mb-3">
            Your AI coding{' '}
            <span className="text-gradient-primary">co-pilot</span>
          </h1>
          <p className="text-secondary-foreground text-base leading-relaxed">
            Debug faster, write better code, and ship with confidence — powered by the world&apos;s best AI models.
          </p>
        </div>

        {/* Code decoration */}
        <div className="bg-muted/60 border border-border rounded-xl p-4 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-negative" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <div className="w-2.5 h-2.5 rounded-full bg-positive" />
            <span className="ml-2 text-2xs text-muted-foreground font-mono">useIsClient.tsx</span>
          </div>
          <pre className="text-xs font-mono text-secondary-foreground leading-relaxed overflow-hidden">
            <code>{codeDecoration}</code>
          </pre>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {features?.map((f, i) => (
            <div
              key={`feature-${i}`}
              className="bg-card/50 border border-border rounded-xl p-3 backdrop-blur-sm"
            >
              <span className="text-lg mb-1.5 block">{f?.icon}</span>
              <p className="text-sm font-semibold text-foreground mb-0.5">{f?.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f?.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}