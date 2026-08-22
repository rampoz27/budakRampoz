'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { CATALOG_TIERS, CATALOG_LEARNING_GUIDE } from '@/lib/catalog-data';
import { fetchCatalogProgress, setCatalogItemChecked } from '@/lib/supabase/catalog-progress';

export default function KatalogDebugWorkspace() {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCatalogProgress()
      .then(setProgress)
      .catch((err) => console.error('Failed to load catalog progress', err))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggleItem(itemId: string) {
    const next = !progress[itemId];
    // Optimistic update — checklist feels instant, matches the pattern of
    // everything else in this app that touches Supabase from the client.
    setProgress((prev) => ({ ...prev, [itemId]: next }));
    try {
      await setCatalogItemChecked(itemId, next);
    } catch (err) {
      console.error('Failed to save checklist state, reverting', err);
      setProgress((prev) => ({ ...prev, [itemId]: !next }));
    }
  }

  const totalRows = CATALOG_TIERS.reduce((sum, t) => sum + t.rows.length, 0);
  const totalChecked = Object.values(progress).filter(Boolean).length;

  const q = search.trim().toLowerCase();
  const filteredTiers = CATALOG_TIERS.map((tier) => ({
    ...tier,
    rows: q
      ? tier.rows.filter(
          (r) =>
            r.gejala.toLowerCase().includes(q) ||
            r.penyebab.toLowerCase().includes(q) ||
            r.konsep.toLowerCase().includes(q)
        )
      : tier.rows,
  })).filter((tier) => tier.rows.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Katalog Debug</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gejala → Solusi: Programming Error dari Junior sampai Senior Architect
          </p>
        </div>
        {!isLoading && (
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {totalChecked}/{totalRows}
            </p>
            <p className="text-2xs text-muted-foreground">dipahami</p>
          </div>
        )}
      </div>

      {/* Cara pakai */}
      <div className="px-6 py-3 border-b border-border flex-shrink-0 bg-muted/20">
        <p className="text-xs text-secondary-foreground">
          <span className="font-semibold text-foreground">Cara pakai:</span> untuk tiap baris, jangan
          langsung deep-dive. Cukup baca gejala + nama solusinya, centang kalau sudah paham konsepnya.
          Deep-dive baru dilakukan saat kasus nyata muncul di kerjaan.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="MagnifyingGlassIcon"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Cari gejala, penyebab, atau konsep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="ArrowPathIcon" size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : filteredTiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon name="MagnifyingGlassIcon" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Nggak ada yang cocok</h3>
            <p className="text-xs text-muted-foreground">Coba kata kunci lain.</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {filteredTiers.map((tier) => {
              const tierChecked = tier.rows.filter((r) => progress[r.id]).length;
              return (
                <div key={tier.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{tier.title}</h3>
                      {tier.subtitle && (
                        <p className="text-2xs text-muted-foreground truncate">{tier.subtitle}</p>
                      )}
                    </div>
                    <span className="text-2xs font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                      {tierChecked}/{tier.rows.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-2xs text-muted-foreground uppercase tracking-wide">
                          <th className="px-4 py-2 w-8"></th>
                          <th className="px-2 py-2 font-semibold">Gejala / Error</th>
                          <th className="px-2 py-2 font-semibold">Penyebab</th>
                          <th className="px-2 py-2 font-semibold">Konsep/Tool yang Dicari</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tier.rows.map((row) => {
                          const checked = !!progress[row.id];
                          return (
                            <tr
                              key={row.id}
                              className="border-t border-border hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 align-top">
                                <button
                                  onClick={() => toggleItem(row.id)}
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    checked
                                      ? 'bg-primary border-primary text-primary-foreground'
                                      : 'border-border text-transparent hover:border-primary/50'
                                  }`}
                                  title={checked ? 'Tandai belum paham' : 'Tandai sudah paham'}
                                >
                                  <Icon name="CheckIcon" size={11} />
                                </button>
                              </td>
                              <td
                                className={`px-2 py-2.5 align-top font-mono ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                              >
                                {row.gejala}
                              </td>
                              <td className="px-2 py-2.5 align-top text-secondary-foreground">
                                {row.penyebab}
                              </td>
                              <td className="px-2 py-2.5 align-top text-primary font-medium">
                                {row.konsep}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Cara belajar efektif */}
            {!q && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Cara belajar efektif dari tabel ini</h3>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {CATALOG_LEARNING_GUIDE.map((point, i) => (
                    <li key={i} className="text-xs text-secondary-foreground">
                      {point}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
