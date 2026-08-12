/**
 * Note Trigger Detector — a self-contained, zero-latency way to catch
 * commands like "tambahkan ke note: ...", "hapus note ...", or
 * "edit note ...: ..." inside a chat message, without calling any LLM.
 * Pure string matching, so it adds no delay and no API cost.
 */

export type NoteAction = 'add' | 'delete' | 'edit';

export interface NoteTriggerMatch {
  matched: boolean;
  action: NoteAction | null;
  // For 'add': the note content itself (may be empty — falls back to the
  // last AI reply). For 'delete'/'edit': the search text used to find
  // the target note.
  target: string;
  // Only used for 'edit' — the replacement content, taken from whatever
  // follows a ":" after the search text.
  newContent: string;
}

const ADD_PHRASES = [
  'tambahkan ke notes',
  'tambahkan ke note',
  'tambahkan ke catatan',
  'simpan ke notes',
  'simpan ke note',
  'simpan ke catatan',
  'catat ini ke note',
  'catat ke note',
  'catat ini',
  'add this to notes',
  'add to notes',
  'add to note',
  'save this as a note',
  'save this to notes',
  'save to notes',
  'save to note',
  'save as note',
];

const DELETE_PHRASES = [
  'hapus catatan',
  'hapus note',
  'delete this note',
  'delete note',
  'remove note',
];

const EDIT_PHRASES = ['ubah catatan', 'ubah note', 'update note', 'edit catatan', 'edit note'];

function matchPhrase(message: string, phrases: string[]): { phrase: string; index: number } | null {
  const lower = message.toLowerCase();
  for (const phrase of phrases) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) return { phrase, index: idx };
  }
  return null;
}

function stripLeadingPunctuation(text: string): string {
  return text.replace(/^[:\-–—,.\s]+/, '').trim();
}

export function detectNoteTrigger(message: string): NoteTriggerMatch {
  const none: NoteTriggerMatch = { matched: false, action: null, target: '', newContent: '' };

  // Check delete and edit first — they're more specific commands than
  // "add", and their phrases don't overlap with add's phrases anyway.
  const del = matchPhrase(message, DELETE_PHRASES);
  if (del) {
    const target = stripLeadingPunctuation(message.slice(del.index + del.phrase.length));
    return { matched: true, action: 'delete', target, newContent: '' };
  }

  const edit = matchPhrase(message, EDIT_PHRASES);
  if (edit) {
    const rest = stripLeadingPunctuation(message.slice(edit.index + edit.phrase.length));
    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) {
      return { matched: true, action: 'edit', target: rest, newContent: '' };
    }
    return {
      matched: true,
      action: 'edit',
      target: rest.slice(0, colonIdx).trim(),
      newContent: rest.slice(colonIdx + 1).trim(),
    };
  }

  const add = matchPhrase(message, ADD_PHRASES);
  if (add) {
    const content = stripLeadingPunctuation(message.slice(add.index + add.phrase.length));
    return { matched: true, action: 'add', target: '', newContent: content };
  }

  return none;
}
