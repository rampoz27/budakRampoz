'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase/client';
import { AI_MODELS } from '@/lib/models';
import {
  fetchPersonaForModel,
  savePersonaForModel,
  TONE_OPTIONS,
  THINKING_STYLE_OPTIONS,
  type Tone,
  type ThinkingStyle,
} from '@/lib/supabase/ai-settings';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile (full name)
  const [fullName, setFullName] = useState('');
  const [nameState, setNameState] = useState<SaveState>('idle');
  const [nameError, setNameError] = useState('');

  // Email
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<SaveState>('idle');
  const [emailError, setEmailError] = useState('');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordState, setPasswordState] = useState<SaveState>('idle');
  const [passwordError, setPasswordError] = useState('');

  // AI Personality — now per model
  const [personaModelId, setPersonaModelId] = useState(AI_MODELS[0]?.id ?? '');
  const [tone, setTone] = useState<Tone>('friendly');
  const [thinkingStyle, setThinkingStyle] = useState<ThinkingStyle>('concise');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);
  const [personaState, setPersonaState] = useState<SaveState>('idle');
  const [personaError, setPersonaError] = useState('');

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (error || !data.user) {
        router.push('/');
        return;
      }
      setUser(data.user);
      setFullName((data.user.user_metadata?.full_name as string) || '');
      setEmail(data.user.email || '');
      setLoadingUser(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load the selected model's persona whenever the model picker changes.
  useEffect(() => {
    if (!personaModelId) return;
    let isCancelled = false;
    setIsLoadingPersona(true);
    setPersonaState('idle');

    fetchPersonaForModel(personaModelId)
      .then((persona) => {
        if (isCancelled) return;
        setTone(persona.tone);
        setThinkingStyle(persona.thinking_style);
        setCustomInstructions(persona.custom_instructions);
      })
      .catch((err) => console.error('Failed to load persona', err))
      .finally(() => {
        if (!isCancelled) setIsLoadingPersona(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [personaModelId]);

  const initials = (fullName || email || 'U')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameState('saving');
    setNameError('');

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      setNameState('error');
      setNameError(error.message);
      return;
    }

    setNameState('saved');
    setTimeout(() => setNameState('idle'), 2000);
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (email === user?.email) return;

    setEmailState('saving');
    setEmailError('');

    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setEmailState('error');
      setEmailError(error.message);
      return;
    }

    setEmailState('saved');
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordState('error');
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordState('error');
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordState('saving');
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordState('error');
      setPasswordError(error.message);
      return;
    }

    setPasswordState('saved');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordState('idle'), 2000);
  }

  async function handleSavePersona(e: React.FormEvent) {
    e.preventDefault();
    setPersonaState('saving');
    setPersonaError('');

    try {
      await savePersonaForModel(personaModelId, {
        tone,
        thinking_style: thinkingStyle,
        custom_instructions: customInstructions,
      });
      setPersonaState('saved');
      setTimeout(() => setPersonaState('idle'), 2000);
    } catch (err) {
      setPersonaState('error');
      setPersonaError(err instanceof Error ? err.message : 'Failed to save.');
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loadingUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-8">Manage your account and profile</p>

        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fullName || 'Unnamed'}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="full-name">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {nameError && <p className="text-xs text-negative">{nameError}</p>}
            <button
              type="submit"
              disabled={nameState === 'saving'}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {nameState === 'saving' && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
              {nameState === 'saved' ? 'Saved ✓' : 'Save name'}
            </button>
          </form>
        </div>

        {/* AI Personality card — now per model */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">AI Personality</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Each model can have its own personality. Switch models mid-chat and the reply style switches with it.
          </p>

          {/* Model picker */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="persona-model">
              Configuring
            </label>
            <select
              id="persona-model"
              value={personaModelId}
              onChange={(e) => setPersonaModelId(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              {AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          {isLoadingPersona ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="ArrowPathIcon" size={18} className="text-muted-foreground animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSavePersona} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tone</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TONE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTone(option.value)}
                      className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                        tone === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${tone === option.value ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                      </p>
                      <p className="text-2xs text-muted-foreground mt-0.5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Thinking style</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {THINKING_STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setThinkingStyle(option.value)}
                      className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                        thinkingStyle === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${thinkingStyle === option.value ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                      </p>
                      <p className="text-2xs text-muted-foreground mt-0.5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="custom-instructions">
                  Anything else this model should always keep in mind?
                </label>
                <textarea
                  id="custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  placeholder="e.g. Always suggest tests for new functions. Prefer functional over class components."
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                />
              </div>

              {personaError && <p className="text-xs text-negative">{personaError}</p>}

              <button
                type="submit"
                disabled={personaState === 'saving'}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {personaState === 'saving' && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                {personaState === 'saved' ? 'Saved ✓' : 'Save personality for this model'}
              </button>
            </form>
          )}
        </div>

        {/* Email card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Email address</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Changing your email sends a confirmation link to the new address before it takes effect.
          </p>
          <form onSubmit={handleSaveEmail} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {emailError && <p className="text-xs text-negative">{emailError}</p>}
            {emailState === 'saved' && (
              <p className="text-xs text-positive">Check your new inbox to confirm the change.</p>
            )}
            <button
              type="submit"
              disabled={emailState === 'saving' || email === user?.email}
              className="flex items-center gap-2 bg-muted border border-border text-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-secondary active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailState === 'saving' && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
              Update email
            </button>
          </form>
        </div>

        {/* Password card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Password</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Use at least 8 characters. You&apos;ll stay signed in on this device.
          </p>
          <form onSubmit={handleSavePassword} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {passwordError && <p className="text-xs text-negative">{passwordError}</p>}
            <button
              type="submit"
              disabled={passwordState === 'saving'}
              className="flex items-center gap-2 bg-muted border border-border text-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-secondary active:scale-95 transition-all disabled:opacity-60"
            >
              {passwordState === 'saving' && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
              {passwordState === 'saved' ? 'Password updated ✓' : 'Update password'}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Sign out</h2>
          <p className="text-xs text-muted-foreground mb-4">
            You&apos;ll need to sign in again to access your workspace.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 bg-negative/10 text-negative border border-negative/30 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-negative/20 active:scale-95 transition-all disabled:opacity-60"
          >
            {signingOut ? (
              <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
            ) : (
              <Icon name="ArrowRightOnRectangleIcon" size={14} />
            )}
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
