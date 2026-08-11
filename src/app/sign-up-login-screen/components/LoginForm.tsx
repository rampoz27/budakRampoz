'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase/client';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Forgot-password mini-flow, inline in the same card.
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsLoading(false);

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    router.push('/ai-chat-interface');
    router.refresh();
  };

  async function handleSendResetLink(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');

    if (!resetEmail.trim()) {
      setResetState('error');
      setResetError('Enter your email first.');
      return;
    }

    setResetState('sending');

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setResetState('error');
      setResetError(error.message);
      return;
    }

    setResetState('sent');
  }

  function backToLogin() {
    setMode('login');
    setResetState('idle');
    setResetError('');
    setResetEmail('');
  }

  if (mode === 'forgot') {
    return (
      <div className="fade-in">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Reset your password</h2>
          <p className="text-secondary-foreground text-sm">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {resetState === 'sent' ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-positive/10 mx-auto mb-4 flex items-center justify-center">
              <Icon name="EnvelopeIcon" size={24} className="text-positive" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Check your inbox</h3>
            <p className="text-sm text-secondary-foreground mb-6">
              We sent a password reset link to <span className="font-medium text-foreground">{resetEmail}</span>.
            </p>
            <button
              type="button"
              onClick={backToLogin}
              className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendResetLink} className="space-y-4">
            {resetState === 'error' && (
              <div className="flex items-start gap-2 bg-negative/10 border border-negative/30 rounded-lg px-3 py-2.5">
                <Icon name="ExclamationCircleIcon" size={16} className="text-negative flex-shrink-0 mt-0.5" />
                <p className="text-sm text-negative">{resetError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reset-email">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="you@domain.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              disabled={resetState === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ minHeight: '44px' }}
            >
              {resetState === 'sending' ? (
                <>
                  <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-secondary-foreground text-sm">Sign in to your CodeMind workspace</p>
      </div>

      {/* Root error */}
      {errors.root && (
        <div className="flex items-start gap-2 bg-negative/10 border border-negative/30 rounded-lg px-3 py-2.5 mb-4">
          <Icon name="ExclamationCircleIcon" size={16} className="text-negative flex-shrink-0 mt-0.5" />
          <p className="text-sm text-negative">{errors.root.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              errors.email ? 'border-negative' : 'border-border'
            }`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-negative mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••"
              className={`w-full bg-input border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.password ? 'border-negative' : 'border-border'
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-negative mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <input
            id="remember-me"
            type="checkbox"
            className="w-4 h-4 rounded border-border bg-input accent-primary"
            {...register('rememberMe')}
          />
          <label htmlFor="remember-me" className="text-sm text-secondary-foreground cursor-pointer">
            Remember me for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ minHeight: '44px' }}
        >
          {isLoading ? (
            <>
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In to CodeMind'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Create one free
        </button>
      </p>
    </div>
  );
}
