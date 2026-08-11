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

    // Registration is invite-only — check the allowlist before creating
    // an account. This RPC only ever returns true/false, it never exposes
    // the actual list of allowed emails.
    const { data: isAllowed, error: allowlistError } = await supabase.rpc('is_email_allowed', {
      check_email: data.email,
    });

    if (allowlistError) {
      setIsLoading(false);
      setError('root', { message: 'Could not verify access. Please try again.' });
      return;
    }

    if (!isAllowed) {
      setIsLoading(false);
      setError('root', {
        message: 'This email is not authorized to register. Contact the administrator to get access.',
      });
      return;
    }

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
        <p className="text-secondary-foreground text-sm">Invite-only — your email must be pre-approved</p>
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
