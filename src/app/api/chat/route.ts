import { NextRequest, NextResponse } from 'next/server';
import { runSearchAgent } from '@/lib/ai/search-agent';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  modelId: string;
  messages: ChatMessage[];
  personaPrompt?: string;
  ragContext?: string;
}

const BASE_SYSTEM_PROMPT =
  'You are a very helpful AI assistant, that can help with everything. ' +
  'You do NOT have the ability to save, edit, or delete notes yourself — that is handled by a separate system outside your control, triggered only when the user explicitly asks to save/edit/delete something. ' +
  'Never claim or imply that you saved, updated, or stored something (e.g. "this has been saved to your notes") unless you are certain that already happened — when in doubt, say nothing about saving at all.';

// Combines the fixed base prompt with the user's custom persona settings
// (tone, thinking style, custom instructions) so personality stays
// consistent no matter which model/provider answers the request.
function buildSystemPrompt(personaPrompt?: string, ragContext?: string): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (personaPrompt) {
    prompt += `\n\n${personaPrompt}`;
  }
  if (ragContext) {
    // Framed explicitly as background, not established fact — the notes
    // were found by automatic similarity search and may be outdated,
    // unrelated, or only partially relevant to the current question.
    prompt +=
      '\n\nThe following notes from the user\'s personal knowledge base were found because they seem related to the current question. Use them if genuinely helpful, but do not treat them as guaranteed accurate or as the only source of truth — verify against the actual conversation and say so if something seems outdated or doesn\'t fit:\n\n' +
      ragContext;
  }
  return prompt;
}

// Maps the model ids used in the UI to the real model id each provider expects.
// 'search-agent' is special-cased below — it's not a single provider call,
// it's the 2-step pipeline defined in src/lib/ai/search-agent.ts.
const MODEL_MAP: Record<
  string,
  { provider: 'openai' | 'anthropic' | 'gemini' | 'groq'; model: string }
> = {
  'gpt-4o': { provider: 'openai', model: 'gpt-5.4-mini' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-5.4' },
  'claude-3-5-sonnet': { provider: 'anthropic', model: 'claude-sonnet-5' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'gemini-pro': { provider: 'gemini', model: 'gemini-3.6-flash' },
  'llama-3.3-70b': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'gpt-oss-120b-groq': { provider: 'groq', model: 'openai/gpt-oss-120b' },
};

async function callOpenAI(messages: ChatMessage[], model: string, systemPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('OPENAI_API_KEY is missing. Add a real key to your .env file.');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGroq(messages: ChatMessage[], model: string, systemPrompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GROQ_API_KEY is missing. Add a real key to your .env file.');
  }

  // Groq exposes an OpenAI-compatible chat completions endpoint.
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(messages: ChatMessage[], model: string, systemPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('ANTHROPIC_API_KEY is missing. Add a real key to your .env file.');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(messages: ChatMessage[], model: string, systemPrompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GEMINI_API_KEY is missing. Add a real key to your .env file.');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// Single dispatcher used both for the requested model and for any
// fallback attempts, so both paths share identical call logic.
async function callModel(modelId: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const mapped = MODEL_MAP[modelId];
  if (!mapped) {
    throw new Error(`Model "${modelId}" is not wired to a provider yet.`);
  }

  if (mapped.provider === 'openai') return callOpenAI(messages, mapped.model, systemPrompt);
  if (mapped.provider === 'anthropic') return callAnthropic(messages, mapped.model, systemPrompt);
  if (mapped.provider === 'groq') return callGroq(messages, mapped.model, systemPrompt);
  return callGemini(messages, mapped.model, systemPrompt);
}

// Every call*() function above throws `Error("<Provider> error (<status>): ...")`
// on a non-OK response — checking for "(429)" in the message is a simple,
// no-extra-plumbing way to tell "rate limited" apart from other failures
// (missing key, bad model id, etc.) without needing custom error classes.
// Every call*() function above throws `Error("<Provider> error (<status>): ...")`
// on a non-OK response. We trigger fallback for two status codes:
//   429 — plain rate limit (too many requests)
//   413 — request too large for the current tokens-per-minute budget
//         (typically because the conversation history has grown long)
// Both mean "this model can't serve the request right now", so the same
// fallback logic applies to either.
function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('(429)') || err.message.includes('(413)');
}

// Free-tier models only, in preference order. 'search-agent' — and the
// commented-out paid OpenAI/Anthropic models — are deliberately excluded:
// falling back into a multi-step pipeline or into a model with no API key
// configured would just trade one failure for another.
const FALLBACK_CHAIN = ['llama-3.3-70b', 'gpt-oss-120b-groq', 'gemini-pro'];

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { modelId, messages, personaPrompt, ragContext } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // The search agent is a separate pipeline with its own prompt
    // structure — persona isn't applied to it (yet).
    if (modelId === 'search-agent') {
      const content = await runSearchAgent(messages);
      return NextResponse.json({ content });
    }

    const mapped = MODEL_MAP[modelId];
    if (!mapped) {
      return NextResponse.json(
        { error: `Model "${modelId}" is not wired to a provider yet.` },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(personaPrompt, ragContext);

    let content = '';
    let actualModelId = modelId;

    try {
      content = await callModel(modelId, messages, systemPrompt);
    } catch (err) {
      if (!isRateLimitError(err)) throw err;

      // Rate-limited — automatically try the other free models instead of
      // just failing. Never retries the one that just failed, and never
      // falls back into search-agent.
      const candidates = FALLBACK_CHAIN.filter((id) => id !== modelId);
      let succeeded = false;
      let lastErr: unknown = err;

      for (const candidateId of candidates) {
        try {
          content = await callModel(candidateId, messages, systemPrompt);
          actualModelId = candidateId;
          succeeded = true;
          break;
        } catch (fallbackErr) {
          lastErr = fallbackErr;
        }
      }

      if (!succeeded) throw lastErr;
    }

    // Let the client know a fallback happened so it can show which model
    // actually answered, instead of silently mislabeling the reply.
    if (actualModelId !== modelId) {
      content = `_Note: the model you selected was rate-limited, so this reply came from **${actualModelId}** instead._\n\n${content}`;
    }

    return NextResponse.json({ content, actualModelId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[/api/chat]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
