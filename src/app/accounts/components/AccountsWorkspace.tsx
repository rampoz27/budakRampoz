'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AccountModal from './AccountModal';
import {
  fetchBankAccounts,
  createBankAccount,
  updateBankAccount,
  updateAccountStatus,
  deleteBankAccount,
  type BankAccountRow,
  type BankAccountInput,
  type AccountStatus,
} from '@/lib/supabase/bank-accounts';

type ModalState = BankAccountRow | null | undefined; // undefined = closed, null = creating

export default function AccountsWorkspace() {
  const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<ModalState>(undefined);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const rows = await fetchBankAccounts();
      setAccounts(rows);
    } catch (err) {
      console.error('Failed to load bank accounts', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.bank_name.toLowerCase().includes(q) ||
      a.account_holder_name.toLowerCase().includes(q) ||
      a.account_number.includes(q)
    );
  });

  async function handleSave(input: BankAccountInput) {
    if (modalState) {
      const updated = await updateBankAccount(modalState.id, input);
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await createBankAccount(input);
      setAccounts((prev) => [created, ...prev]);
    }
    setModalState(undefined);
  }

  async function handleStatusChange(id: string, status: AccountStatus) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await updateAccountStatus(id, status);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    try {
      await deleteBankAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete account', err);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Rekening</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola daftar rekening — AI bisa akses yang berstatus Aktif saat kamu tanya di chat.
          </p>
        </div>
        <button
          onClick={() => setModalState(null)}
          className="flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <Icon name="PlusIcon" size={16} />
          Tambah rekening
        </button>
      </div>

      <div className="px-6 py-3 flex-shrink-0">
        <div className="relative max-w-sm">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Cari bank, nama, atau nomor rekening..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="CreditCardIcon" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {accounts.length === 0 ? 'Belum ada rekening' : 'Nggak ada yang cocok'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {accounts.length === 0 ? 'Tambahin rekening pertama kamu.' : 'Coba kata kunci lain.'}
            </p>
            {accounts.length === 0 && (
              <button
                onClick={() => setModalState(null)}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              >
                <Icon name="PlusIcon" size={14} />
                Tambah rekening
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Bank
                    </th>
                    <th className="text-left px-3 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nama Rekening
                    </th>
                    <th className="text-left px-3 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      No. Rekening
                    </th>
                    <th className="text-left px-3 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Screenshot
                    </th>
                    <th className="text-left px-3 py-3 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-20 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((acc, i) => (
                    <tr
                      key={acc.id}
                      className={`border-b border-border last:border-b-0 group ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-foreground">{acc.bank_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-foreground">{acc.account_holder_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-secondary-foreground font-mono">{acc.account_number}</span>
                      </td>
                      <td className="px-3 py-3">
                        {acc.screenshot_url ? (
                          <a
                            href={acc.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={acc.status}
                          onChange={(e) => handleStatusChange(acc.id, e.target.value as AccountStatus)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border outline-none cursor-pointer transition-colors ${
                            acc.status === 'active'
                              ? 'bg-positive/10 text-positive border-positive/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Di offkan</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModalState(acc)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Icon name="PencilIcon" size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-negative hover:bg-negative/10 transition-colors"
                            title="Delete"
                          >
                            <Icon name="TrashIcon" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalState !== undefined && (
        <AccountModal account={modalState} onClose={() => setModalState(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
