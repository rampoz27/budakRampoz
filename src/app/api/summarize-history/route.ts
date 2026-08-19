import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { existingSummary, newMessages } = (await req.json()) as {
      existingSummary?: string;
      newMessages: HistoryMessage[];
    };

    if (!newMessages || newMessages.length === 0) {
      return NextResponse.json({ summary: existingSummary ?? '' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      // Fail safe: nothing usable to summarize with — hand back whatever
      // summary already existed (possibly empty) rather than erroring the
      // whole chat turn over a missing key.
      return NextResponse.json({ summary: existingSummary ?? '' });
    }

    const newMessagesText = newMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You maintain a running summary of an ongoing conversation, so older messages can be dropped from the model's context without losing the thread. You will be given the EXISTING summary (may be empty, if this is the first time) and a batch of NEW messages that just aged out of the active context window. Merge the new messages into the summary and output the UPDATED summary as plain text — no JSON, no headers, no preamble, just the summary itself.

Rules:
- Write in the same language the conversation is mostly in (usually Indonesian).
- Preserve PRECISE technical details exactly as given — variable names, file names, model IDs, exact numbers, specific decisions made, error messages, URLs. Do NOT paraphrase or generalize these away. A vague summary that loses these details is worse than a longer one that keeps them.
- Keep it reasonably concise for the non-technical parts (general topics discussed, casual exchanges) — condense those freely.
- Write it as a coherent narrative a person could quickly read to understand "what has this conversation covered so far", not as a list of disconnected facts.
- If the existing summary is empty, just summarize the new messages alone.`;

    const userPrompt = existingSummary
      ? `EXISTING SUMMARY:\n${existingSummary}\n\nNEW MESSAGES TO MERGE IN:\n${newMessagesText}`
      : `NEW MESSAGES TO SUMMARIZE:\n${newMessagesText}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        // Same fix as the classify-*-intent routes: without this, Qwen's
        // visible <think> reasoning can end up mixed into the plain-text
        // output instead of staying separate.
        reasoning_effort: 'none',
      }),
    });

    if (!res.ok) {
      console.error('[/api/summarize-history] LLM call failed', await res.text());
      // Fail safe: keep using whatever summary we had rather than losing
      // it or blocking the chat turn.
      return NextResponse.json({ summary: existingSummary ?? '' });
    }

    const data = await res.json();
    const updatedSummary: string = data.choices?.[0]?.message?.content?.trim() ?? existingSummary ?? '';

    return NextResponse.json({ summary: updatedSummary });
  } catch (err) {
    console.error('[/api/summarize-history]', err);
    return NextResponse.json({ summary: '' });
  }
}
