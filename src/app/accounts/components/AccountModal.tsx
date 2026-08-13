'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { BankAccountRow, BankAccountInput, AccountStatus } from '@/lib/supabase/bank-accounts';

interface AccountModalProps {
  account: BankAccountRow | null; // null = creating new
  onClose: () => void;
  onSave: (input: BankAccountInput) => Promise<void>;
}

export default function AccountModal({ account, onClose, onSave }: AccountModalProps) {
  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setBankName(account.bank_name);
      setHolderName(account.account_holder_name);
      setAccountNumber(account.account_number);
      setScreenshotUrl(account.screenshot_url || '');
      setStatus(account.status);
    }
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!bankName.trim() || !holderName.trim() || !accountNumber.trim()) {
      setError('Bank, nama, dan nomor rekening wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        bank_name: bankName.trim(),
        account_holder_name: holderName.trim(),
        account_number: accountNumber.trim(),
        screenshot_url: screenshotUrl.trim(),
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account.');
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {account ? 'Edit rekening' : 'Tambah rekening'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="acc-bank">
              Bank
            </label>
            <input
              id="acc-bank"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. BCA"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="acc-name">
              Nama Rekening
            </label>
            <input
              id="acc-name"
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Nama pemilik rekening"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="acc-number">
              No. Rekening
            </label>
            <input
              id="acc-number"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="1234567890"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="acc-screenshot">
              Link Screenshot (optional)
            </label>
            <input
              id="acc-screenshot"
              type="text"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="acc-status">
              Status
            </label>
            <select
              id="acc-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Di offkan</option>
            </select>
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {isSaving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
              {account ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
