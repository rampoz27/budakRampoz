/**
 * Note Trigger Detector — a self-contained, zero-latency way to catch
 * commands like "tambahkan ke note: ..." or "save this to notes" inside a
 * chat message, without calling any LLM. Pure string matching, so it adds
 * no delay and no API cost to every message sent.
 */

export interface NoteTriggerMatch {
  matched: boolean;
  extractedContent: string; // text found after the trigger phrase, trimmed
}

// Order matters only in that longer/more specific phrases should be
// checked first if they overlap — none of these overlap meaningfully here.
const TRIGGER_PHRASES = [
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

export function detectNoteTrigger(message: string): NoteTriggerMatch {
  const lower = message.toLowerCase();

  for (const phrase of TRIGGER_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const after = message
        .slice(idx + phrase.length)
        .replace(/^[:\-–—,.\s]+/, '') // strip a leading ":", "-", etc.
        .trim();
      return { matched: true, extractedContent: after };
    }
  }

  return { matched: false, extractedContent: '' };
}
