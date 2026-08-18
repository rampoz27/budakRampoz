import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export type NoteIntentAction = 'add' | 'delete' | 'edit' | 'none';

export interface NoteIntentResult {
  action: NoteIntentAction;
  target: string;
  content: string;
}

const CLASSIFY_SYSTEM_PROMPT = `You classify whether a chat message is a COMMAND to manage the user's personal notes, or something else entirely (a question, a statement, general conversation).

Respond with STRICT JSON only, no other text, matching exactly this shape:
{"action": "add" | "delete" | "edit" | "none", "target": string, "content": string}

Rules:
- "add": the user is telling you to save something as a new note. "content" = what to save, taken from their message. Leave "content" as an empty string if they didn't specify what to save (e.g. "add that to my notes" referring to something said earlier) — the caller will fall back to the previous AI reply.
- "delete": the user is telling you to remove an existing note. "target" = text identifying which note (e.g. a keyword from its title).
- "edit": the user is telling you to change an existing note. "target" = which note. "content" = the new content, if given.
- "none": the message is NOT a command. This includes QUESTIONS about notes (e.g. "has this been saved to notes yet?", "is the note there?", "did you add it?"), and any message where saving/deleting/editing isn't a direct instruction. When genuinely unsure, prefer "none" — it is much safer to ask again than to silently modify the user's notes on a guess.

Only output the JSON object, nothing else.`;

export async function POST(req: NextRequest) {
  try {
    const { message, lastAssistantContent } = (await req.json()) as {
      message: string;
      lastAssistantContent?: string;
    };

    if (!message) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      // Fail safe: if we can't classify, treat as "not a command" rather
      // than risk a false-positive note action.
      return NextResponse.json({ action: 'none', target: '', content: '' });
    }

    const contextNote = lastAssistantContent
      ? `\n\n(For context, the AI's previous reply was: "${lastAssistantContent.slice(0, 300)}")`
      : '';

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: `Message: "${message}"${contextNote}` },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      // Same fail-safe reasoning as above.
      console.error('[/api/classify-note-intent] LLM call failed', await res.text());
      return NextResponse.json({ action: 'none', target: '', content: '' });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: NoteIntentResult;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { action: 'none', target: '', content: '' };
    }

    return NextResponse.json({
      action: parsed.action ?? 'none',
      target: parsed.target ?? '',
      content: parsed.content ?? '',
    });
  } catch (err) {
    console.error('[/api/classify-note-intent]', err);
    // Fail safe on any unexpected error too.
    return NextResponse.json({ action: 'none', target: '', content: '' });
  }
}
