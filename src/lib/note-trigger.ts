/**
 * Note Trigger Detector — a self-contained, zero-latency way to catch
 * commands like "tambahkan ke note: ...", "hapus note ...", or casual
 * phrasing like "ketambah note pasaran togel tadi ke note", without
 * calling any LLM. Pure regex matching, so it adds no delay and no API
 * cost to every message sent.
 *
 * Instead of requiring one exact contiguous phrase, this looks for an
 * action verb (in any form — "tambah", "tambahkan", "ketambah", etc.)
 * appearing anywhere near the word "note"/"catatan" in the message. This
 * is deliberately loose to handle casual, informal phrasing.
 */

export type NoteAction = 'add' | 'delete' | 'edit';

export interface NoteTriggerMatch {
  matched: boolean;
  action: NoteAction | null;
  // For 'add': explicit content if the message had a ":" separating the
  // command from the content (e.g. "tambahkan ke note: ..."). Empty if
  // the phrasing was too casual to reliably extract — falls back to the
  // last AI reply instead.
  // For 'delete'/'edit': the search text used to find the target note.
  target: string;
  // Only used for 'edit' — the replacement content.
  newContent: string;
}

const NOTE_KEYWORD = /\b(notes?|catatan)\b/i;
const DELETE_VERB = /\b(hapus|delete|remove)\b/i;
const EDIT_VERB = /\b(edit|ubah|update|ganti)\b/i;
// Matches "tambah", "tambahkan", "tambahin", "ketambah", "simpan",
// "catat", "add", "save" — covers common root/prefix/suffix variations.
const ADD_VERB = /\b(?:ke)?tambah(?:kan|in)?\b|\bsimpan\b|\bcatat\b|\badd\b|\bsave\b/i;

function stripMatchedKeywords(message: string, verbRegex: RegExp): string {
  return message
    .replace(verbRegex, ' ')
    .replace(NOTE_KEYWORD, ' ')
    .replace(/\b(ke|ini|itu|tadi|to|this|that)\b/gi, ' ') // common filler words
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectNoteTrigger(message: string): NoteTriggerMatch {
  const none: NoteTriggerMatch = { matched: false, action: null, target: '', newContent: '' };

  if (!NOTE_KEYWORD.test(message)) return none;

  // Delete and edit checked first — more specific/destructive, so they
  // should win if their verb is present alongside "note".
  if (DELETE_VERB.test(message)) {
    const target = stripMatchedKeywords(message, DELETE_VERB);
    return { matched: true, action: 'delete', target, newContent: '' };
  }

  if (EDIT_VERB.test(message)) {
    const rest = stripMatchedKeywords(message, EDIT_VERB);
    const colonIdx = message.indexOf(':');
    if (colonIdx === -1) {
      return { matched: true, action: 'edit', target: rest, newContent: '' };
    }
    const target = stripMatchedKeywords(message.slice(0, colonIdx), EDIT_VERB);
    const newContent = message.slice(colonIdx + 1).trim();
    return { matched: true, action: 'edit', target, newContent };
  }

  if (ADD_VERB.test(message)) {
    const colonIdx = message.indexOf(':');
    if (colonIdx !== -1) {
      const beforeColon = message.slice(0, colonIdx);
      // Only treat text after ":" as explicit content if the part before
      // it actually looks like the command itself (short, contains the
      // verb+keyword) — otherwise the ":" probably belongs to unrelated
      // content and we should fall back to the last AI reply instead.
      if (beforeColon.length < 60 && ADD_VERB.test(beforeColon) && NOTE_KEYWORD.test(beforeColon)) {
        return {
          matched: true,
          action: 'add',
          target: '',
          newContent: message.slice(colonIdx + 1).trim(),
        };
      }
    }
    // No reliable explicit content — signal "add" with empty content so
    // the caller falls back to saving the last AI reply.
    return { matched: true, action: 'add', target: '', newContent: '' };
  }

  return none;
}
