/**
 * Note Intent Detection — two-stage, cost-aware design:
 *
 * Stage 1 (this file, `mightBeNoteCommand`): a zero-cost regex prefilter.
 * The vast majority of chat messages don't mention notes at all, so this
 * short-circuits instantly for them — no API call, no delay.
 *
 * Stage 2 (`classifyNoteIntent`, calls /api/classify-note-intent): only
 * runs for the smaller subset of messages that passed stage 1. Uses an
 * LLM to correctly tell a real command ("tambahkan ke note: ...") apart
 * from a question that merely mentions notes ("udah ketambah note
 * belum?") — something plain keyword matching can never reliably do.
 */

export type NoteAction = 'add' | 'delete' | 'edit' | 'none';

export interface NoteIntentResult {
  action: NoteAction;
  target: string;
  content: string;
}

const NOTE_KEYWORD = /\b(notes?|catatan)\b/i;
const ANY_NOTE_VERB =
  /\b(?:ke)?tambah(?:kan|in)?\b|\b(?:ke)?masuk(?:kan|in)?\b|\btaru[hk](?:in)?\b|\bsimpe?n(?:in)?\b|\bcatat(?:kan|in)?\b|\bcatetin\b|\badd\b|\bsave\b|\bhapus\b|\bdelete\b|\bremove\b|\bedit\b|\bubah\b|\bupdate\b|\bganti\b/i;

// Cheap, synchronous — call this first. Only proceed to
// classifyNoteIntent() if this returns true.
export function mightBeNoteCommand(message: string): boolean {
  return NOTE_KEYWORD.test(message) && ANY_NOTE_VERB.test(message);
}

// Calls the LLM-backed classifier. Only call this after
// mightBeNoteCommand() returns true, to avoid spending an API call on
// every single message.
export async function classifyNoteIntent(
  message: string,
  lastAssistantContent?: string
): Promise<NoteIntentResult> {
  try {
    const res = await fetch('/api/classify-note-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lastAssistantContent }),
    });
    const data = await res.json();
    return {
      action: data.action ?? 'none',
      target: data.target ?? '',
      content: data.content ?? '',
    };
  } catch (err) {
    console.error('Note intent classification failed, treating as not a command', err);
    return { action: 'none', target: '', content: '' };
  }
}
