'use client';

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Icon from '@/components/ui/AppIcon';

interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

interface CompareResult {
  onlyInA: Record<string, unknown>[];
  onlyInB: Record<string, unknown>[];
}

// Trim + lowercase — bikin "Budi ", "budi", "BUDI" dianggap nilai yang sama.
function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function parseCsvFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter((h): h is string => !!h);
        resolve({ fileName: file.name, headers, rows: results.data as Record<string, unknown>[] });
      },
      error: (err: Error) => reject(err),
    });
  });
}

function parseExcelFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({ fileName: file.name, headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCsvFile(file);
  if (ext === 'xlsx' || ext === 'xls') return parseExcelFile(file);
  throw new Error(`Format file ".${ext}" tidak didukung — pakai .csv, .xlsx, atau .xls`);
}

function compareFiles(fileA: ParsedFile, colA: string, fileB: ParsedFile, colB: string): CompareResult {
  const setA = new Set(fileA.rows.map((r) => normalize(r[colA])));
  const setB = new Set(fileB.rows.map((r) => normalize(r[colB])));
  const onlyInA = fileA.rows.filter((r) => !setB.has(normalize(r[colA])));
  const onlyInB = fileB.rows.filter((r) => !setA.has(normalize(r[colB])));
  return { onlyInA, onlyInB };
}

function FileDropZone({
  label,
  file,
  onFileSelect,
  error,
}: {
  label: string;
  file: ParsedFile | null;
  onFileSelect: (file: File) => void;
  error: string | null;
}) {
  const inputId = `file-input-${label}`;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <label
        htmlFor={inputId}
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
      >
        <Icon
          name={file ? 'DocumentCheckIcon' : 'ArrowUpTrayIcon'}
          size={22}
          className={file ? 'text-primary' : 'text-muted-foreground'}
        />
        {file ? (
          <div className="text-center min-w-0">
            <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{file.fileName}</p>
            <p className="text-2xs text-muted-foreground">{file.rows.length} baris, {file.headers.length} kolom</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Klik buat pilih file
            <br />
            <span className="text-2xs">.csv, .xlsx, atau .xls</span>
          </p>
        )}
        <input
          id={inputId}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelect(f);
            e.target.value = ''; // biar bisa pilih file yang sama lagi kalau mau ganti
          }}
        />
      </label>
      {error && <p className="text-2xs text-negative mt-1.5">{error}</p>}
    </div>
  );
}

function ResultTable({ title, rows, badgeColor }: { title: string; rows: Record<string, unknown>[]; badgeColor: string }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${badgeColor}`}>
          {rows.length} baris
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          Nggak ada — semua data di sini juga ada di sisi lain. 🎉
        </p>
      ) : (
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-2xs text-muted-foreground uppercase tracking-wide">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold border-b border-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-secondary-foreground whitespace-nowrap">
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DataCompareWorkspace() {
  const [fileA, setFileA] = useState<ParsedFile | null>(null);
  const [fileB, setFileB] = useState<ParsedFile | null>(null);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const handleFileA = useCallback(async (file: File) => {
    setErrorA(null);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      setFileA(parsed);
      setColA(parsed.headers[0] ?? '');
    } catch (err) {
      setErrorA(err instanceof Error ? err.message : 'Gagal membaca file');
      setFileA(null);
    }
  }, []);

  const handleFileB = useCallback(async (file: File) => {
    setErrorB(null);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      setFileB(parsed);
      setColB(parsed.headers[0] ?? '');
    } catch (err) {
      setErrorB(err instanceof Error ? err.message : 'Gagal membaca file');
      setFileB(null);
    }
  }, []);

  function handleCompare() {
    if (!fileA || !fileB || !colA || !colB) return;
    setIsComparing(true);
    // setTimeout kecil biar spinner sempat kerender buat file yang gede
    setTimeout(() => {
      setResult(compareFiles(fileA, colA, fileB, colB));
      setIsComparing(false);
    }, 50);
  }

  const canCompare = fileA && fileB && colA && colB;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground">Data Compare</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bandingkan 2 file (CSV/Excel) — lihat data yang cuma ada di salah satu file.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Upload 2 file */}
        <div className="flex gap-4">
          <FileDropZone label="File A" file={fileA} onFileSelect={handleFileA} error={errorA} />
          <FileDropZone label="File B" file={fileB} onFileSelect={handleFileB} error={errorB} />
        </div>

        {/* Pilih kolom pembanding */}
        {fileA && fileB && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground mb-3">
              Kolom mana yang mau dibandingkan?
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-2xs text-muted-foreground mb-1 block">Kolom dari File A</label>
                <select
                  value={colA}
                  onChange={(e) => { setColA(e.target.value); setResult(null); }}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                >
                  {fileA.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <Icon name="ArrowsRightLeftIcon" size={16} className="text-muted-foreground flex-shrink-0 mt-4" />
              <div className="flex-1 min-w-0">
                <label className="text-2xs text-muted-foreground mb-1 block">Kolom dari File B</label>
                <select
                  value={colB}
                  onChange={(e) => { setColB(e.target.value); setResult(null); }}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                >
                  {fileB.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCompare}
              disabled={!canCompare || isComparing}
              className="mt-4 flex items-center gap-2 bg-gradient-primary text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isComparing ? (
                <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              ) : (
                <Icon name="MagnifyingGlassIcon" size={16} />
              )}
              Bandingkan
            </button>
          </div>
        )}

        {/* Hasil */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResultTable
                title={`Cuma ada di File A (${fileA?.fileName})`}
                rows={result.onlyInA}
                badgeColor="bg-primary/20 text-primary"
              />
              <ResultTable
                title={`Cuma ada di File B (${fileB?.fileName})`}
                rows={result.onlyInB}
                badgeColor="bg-accent/20 text-accent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
