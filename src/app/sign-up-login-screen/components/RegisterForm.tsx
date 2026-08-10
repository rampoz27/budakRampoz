'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase/client';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
      },
    });

    setIsLoading(false);

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    // If "Confirm email" is enabled in Supabase (default), signUp succeeds
    // but there's no active session yet — the user must click the link
    // in their inbox before they can sign in.
    if (!signUpData.session) {
      setConfirmEmailSent(true);
      return;
    }

    router.push('/ai-chat-interface');
    router.refresh();
  };

  const passwordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(passwordValue || '');
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-negative', 'bg-warning', 'bg-accent', 'bg-positive'];

  if (confirmEmailSent) {
    return (
      <div className="fade-in text-center py-8">
        <div className="w-14 h-14 rounded-2xl bg-positive/10 mx-auto mb-4 flex items-center justify-center">
          <Icon name="EnvelopeIcon" size={24} className="text-positive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Check your inbox</h2>
        <p className="text-secondary-foreground text-sm mb-6">
          We sent a confirmation link to your email. Click it to activate your account, then sign in.
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Create your workspace</h2>
        <p className="text-secondary-foreground text-sm">Free forever — no credit card needed</p>
      </div>

      {/* Social Auth */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-all duration-150 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-all duration-150 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or register with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Root error */}
      {errors.root && (
        <div className="flex items-start gap-2 bg-negative/10 border border-negative/30 rounded-lg px-3 py-2.5 mb-4">
          <Icon name="ExclamationCircleIcon" size={16} className="text-negative flex-shrink-0 mt-0.5" />
          <p className="text-sm text-negative">{errors.root.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reg-name">
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              errors.fullName ? 'border-negative' : 'border-border'
            }`}
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.fullName && (
            <p className="text-xs text-negative mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reg-email">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              errors.email ? 'border-negative' : 'border-border'
            }`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-negative mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reg-password">
            Password
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">Min. 8 characters with uppercase, number, and symbol</p>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={`w-full bg-input border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.password ? 'border-negative' : 'border-border'
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters required' },
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
          {/* Strength bar */}
          {passwordValue && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={`strength-${level}`}
                    className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                      strength >= level ? strengthColors[strength] : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-medium ${strength >= 3 ? 'text-positive' : strength === 2 ? 'text-warning' : 'text-negative'}`}>
                {strengthLabels[strength]}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-negative mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reg-confirm">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              className={`w-full bg-input border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.confirmPassword ? 'border-negative' : 'border-border'
              }`}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === passwordValue || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={showConfirm ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-negative mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input
            id="agree-terms"
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-border bg-input accent-primary flex-shrink-0"
            {...register('agreeTerms', { required: 'You must agree to the terms' })}
          />
          <label htmlFor="agree-terms" className="text-sm text-secondary-foreground cursor-pointer leading-relaxed">
            I agree to the{' '}
            <button type="button" className="text-primary hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-primary hover:underline">Privacy Policy</button>
          </label>
        </div>
        {errors.agreeTerms && (
          <p className="text-xs text-negative -mt-2">{errors.agreeTerms.message}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ minHeight: '44px' }}
        >
          {isLoading ? (
            <>
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              Creating workspace...
            </>
          ) : (
            'Create Free Account'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}