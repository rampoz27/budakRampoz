'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase/client';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's browser client parses the recovery token from the URL
    // automatically on load and establishes a temporary session. Give it
    // a brief moment, then check.
    let attempts = 0;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setLinkState('valid');
        return;
      }
      attempts += 1;
      if (attempts < 5) {
        setTimeout(check, 300);
      } else {
        setLinkState('invalid');
      }
    }

    check();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-lg text-foreground">CodeMind</span>
        </div>

        {linkState === 'checking' && (
          <div className="flex flex-col items-center py-10">
            <Icon name="ArrowPathIcon" size={24} className="text-muted-foreground animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
          </div>
        )}

        {linkState === 'invalid' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-negative/10 mx-auto mb-4 flex items-center justify-center">
              <Icon name="ExclamationTriangleIcon" size={24} className="text-negative" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">This link is invalid or expired</h2>
            <p className="text-sm text-secondary-foreground mb-6">
              Reset links only work once and expire after a while. Request a new one from the sign-in page.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}

        {linkState === 'valid' && !done && (
          <div className="fade-in">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Set a new password</h2>
              <p className="text-sm text-secondary-foreground">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-negative/10 border border-negative/30 rounded-lg px-3 py-2.5">
                  <Icon name="ExclamationCircleIcon" size={16} className="text-negative flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-negative">{error}</p>
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ minHeight: '44px' }}
              >
                {isSaving ? (
                  <>
                    <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          </div>
        )}

        {done && (
          <div className="text-center py-6 fade-in">
            <div className="w-14 h-14 rounded-2xl bg-positive/10 mx-auto mb-4 flex items-center justify-center">
              <Icon name="CheckCircleIcon" size={24} className="text-positive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Password updated</h2>
            <p className="text-sm text-secondary-foreground mb-6">
              You&apos;re all set — you can now sign in with your new password.
            </p>
            <button
              type="button"
              onClick={() => router.push('/ai-chat-interface')}
              className="inline-flex items-center gap-2 bg-gradient-primary text-white font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Continue to CodeMind
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
