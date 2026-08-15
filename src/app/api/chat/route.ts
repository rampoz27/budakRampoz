import { NextRequest, NextResponse } from 'next/server';
import { runSearchAgent } from '@/lib/ai/search-agent';
import { buildPersonaPrompt, DEFAULT_PERSONA, type PersonaInput } from '@/lib/persona-format';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  modelId: string;
  messages: ChatMessage[];
  personaSettings?: PersonaInput;
  ragContext?: string;
  currentDateTime?: string;
  shiftContext?: string;
  accountsContext?: string;
}

const BASE_SYSTEM_PROMPT =
  'You are a very helpful AI assistant, that can help with everything. ' +
  'You are one of several AI models available inside CodeMind, a multi-model AI assistant app. The lineup includes: GPT-OSS 120B, Llama 3.3 70B, Gemini 3.6 Flash, and an AI Search Agent — users can address any of them by name in chat (e.g. "gemini, ..."), and the app can automatically switch to a different model mid-conversation if the one selected is temporarily rate-limited. These are all sibling models within the same app, not unrelated external products — if a user asks about one of the others, you DO know it exists and what it is (from this description), even though you can\'t speak on its behalf or access its internals. ' +
  'You cannot directly CREATE, EDIT, or DELETE notes yourself — that only happens through a separate system, triggered when the user explicitly asks to save/edit/delete something. Never claim or imply that you just saved, updated, or deleted something unless you are certain that already happened. ' +
  'If a message reaches you as a normal question (not a system-handled note action), that means the note system did not recognize it as a command — do NOT try to simulate, roleplay, or fake performing the action yourself, and never output JSON, tool-call-like syntax, or any structured blob pretending to invoke a note action. Just answer in plain language, and if you think they wanted to save/edit/delete a note, tell them plainly to try rephrasing (e.g. "coba ketik: tambahkan ke note: ..."). ' +
  'However, if relevant notes ARE provided to you below as background context, you DO have read access to them for this reply — use them normally and do not claim you "cannot see" or "cannot access" notes that are visibly included in your context.';

function buildSystemPrompt(
  personaSettings: PersonaInput | undefined,
  ragContext: string | undefined,
  includeNickname: boolean,
  hasLiveSearch: boolean,
  standInFor?: string,
  currentDateTime?: string,
  shiftContext?: string,
  accountsContext?: string
): string {
  let prompt = BASE_SYSTEM_PROMPT;
  prompt += hasLiveSearch
    ? '\n\nYou have access to live Google Search grounding — when a question needs current/real-time information (exchange rates, prices, news, scores, or anything else that changes over time), use it to find accurate current data instead of guessing from training data. Cite sources when you use it.'
    : '\n\nYou do NOT have real-time internet access, live data feeds, or the ability to browse the web. If asked about anything that changes over time and that you cannot verify from your training data or the context provided to you below — exchange rates, stock/crypto prices, current news, sports scores, weather, or any other live figure — do NOT fabricate a specific number, source, or date to sound authoritative. Say plainly that you don\'t have real-time access and suggest the user switch to the "AI Search Agent" model (in the dropdown, or by typing "search agent, ...") which actually searches the live web.';
  if (currentDateTime) {
    prompt += `\n\nThe current date and time (in the user's local timezone) is: ${currentDateTime}. Use this whenever the user asks about today's date, the current time, day of the week, or anything time-relative ("in 3 days", "how long until...", etc.) — your training data has a cutoff, so always trust this value over any date you might otherwise assume.`;
  }
  if (shiftContext) {
    prompt +=
      `\n\nThe user currently has an active work shift. Here is its live status — you have read access to this and should use it naturally when asked about the shift or jobdesk, but you cannot check tasks off yourself in normal conversation (that only happens through the separate jobdesk command system):\n\n${shiftContext}`;
  }
  if (accountsContext) {
    prompt +=
      `\n\nThe user has the following active bank accounts on file (format: Bank — Account holder name — reference code). The reference code (looks like "{{ACC-xxxxxxxx}}") is a placeholder that a separate system swaps for the real account number before the user ever sees it — you never see the actual digits, and neither does anyone else who can read this conversation. When the user asks for an account's number, respond with the reference code EXACTLY as given (including the curly braces), as if it were the number itself — do not describe it as a code or explain the substitution, just use it naturally in your sentence. Never invent or guess a number of your own:\n\n${accountsContext}`;
  }
  const personaText = buildPersonaPrompt(personaSettings ?? DEFAULT_PERSONA, includeNickname);
  if (personaText) {
    prompt += `\n\n${personaText}`;
  }
  if (standInFor) {
    prompt +=
      `\n\nRight now, you are specifically standing in for "${standInFor}" because it's temporarily rate-limited — the user may have addressed it by name. If they ask about it, acknowledge you're filling in for it and that you're both part of the same CodeMind system, rather than saying you have no information about it.`;
  }
  if (ragContext) {
    prompt +=
      '\n\nThe following notes from the user\'s personal knowledge base were found because they seem related to the current question. You DO have access to read these — use them if genuinely helpful, but do not treat them as guaranteed accurate or as the only source of truth — verify against the actual conversation and say so if something seems outdated or doesn\'t fit:\n\n' +
      ragContext;
  }
  return prompt;
}

const MODEL_MAP: Record<string, { provider: 'openai' | 'anthropic' | 'groq' | 'gemini'; model: string }> = {
  'gpt-4o': { provider: 'openai', model: 'gpt-5.4-mini' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-5.4' },
  'claude-3-5-sonnet': { provider: 'anthropic', model: 'claude-sonnet-5' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'gemini-pro': { provider: 'gemini', model: 'gemini-3.6-flash' },
  'llama-3.3-70b': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'gpt-oss-120b-groq': { provider: 'groq', model: 'openai/gpt-oss-120b' },
};

const encoder = new TextEncoder();

function sseEvent(obj: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

// ── Streaming callers — each pushes {type:"chunk", text} events directly
//    onto the outer controller as content arrives, and throws BEFORE any
//    chunk is enqueued if the initial connection fails (429/413/etc) —
//    that's what keeps the rate-limit fallback logic safe: nothing has
//    been sent to the client yet when a candidate turns out to be bad.

async function streamGroq(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GROQ_API_KEY is missing. Add a real key to your .env file.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) controller.enqueue(sseEvent({ type: 'chunk', text: delta }));
      } catch {
        // ignore a malformed/partial SSE line
      }
    }
  }
}

async function streamGemini(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GEMINI_API_KEY is missing. Add a real key to your .env file.');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        // Grounding with Google Search: the model decides per-query
        // whether live search would improve the answer.
        tools: [{ google_search: {} }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error (${res.status}): ${errText}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let groundingChunks: Array<{ web?: { uri?: string; title?: string } }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr) continue;
      try {
        const json = JSON.parse(dataStr);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) controller.enqueue(sseEvent({ type: 'chunk', text }));

        const chunks = json.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) groundingChunks = chunks;
      } catch {
        // ignore a malformed/partial SSE line
      }
    }
  }

  if (groundingChunks.length > 0) {
    const sources = groundingChunks
      .filter((c) => c.web?.uri)
      .map((c, i) => `[${i + 1}] ${c.web?.title || c.web?.uri} — ${c.web?.uri}`)
      .join('\n');
    if (sources) {
      controller.enqueue(sseEvent({ type: 'chunk', text: `\n\n---\n**Sources (via Google Search)**\n${sources}` }));
    }
  }
}

// Single dispatcher used both for the requested model and for any
// fallback attempts, so both paths share identical call logic.
async function streamModel(
  modelId: string,
  messages: ChatMessage[],
  systemPrompt: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const mapped = MODEL_MAP[modelId];
  if (!mapped) {
    throw new Error(`Model "${modelId}" is not wired to a provider yet.`);
  }
  if (mapped.provider === 'groq') return streamGroq(messages, mapped.model, systemPrompt, controller);
  if (mapped.provider === 'gemini') return streamGemini(messages, mapped.model, systemPrompt, controller);
  throw new Error(`Streaming isn't implemented for provider "${mapped.provider}" yet (no API key configured anyway).`);
}

// Every stream*() function above throws `Error("<Provider> error (<status>): ...")`
// on a non-OK response — checking for "(429)"/"(413)" is a simple way to
// tell "rate limited / request too large" apart from other failures.
function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('(429)') || err.message.includes('(413)');
}

// Free-tier models only, in preference order. 'search-agent' — and the
// commented-out paid OpenAI/Anthropic models — are deliberately excluded.
const FALLBACK_CHAIN = ['llama-3.3-70b', 'gpt-oss-120b-groq', 'gemini-pro'];

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { modelId, messages, personaSettings, ragContext, currentDateTime, shiftContext, accountsContext } =
      body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // The search agent is a separate multi-step pipeline (query
    // formulation → search → synthesis) — not a good fit for token
    // streaming, so it stays a single JSON response like before.
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

    const isGemini = (id: string) => MODEL_MAP[id]?.provider === 'gemini';

    const stream = new ReadableStream({
      async start(controller) {
        let actualModelId = modelId;
        let succeeded = false;

        try {
          const primarySystemPrompt = buildSystemPrompt(
            personaSettings,
            ragContext,
            true,
            isGemini(modelId),
            undefined,
            currentDateTime,
            shiftContext,
            accountsContext
          );
          await streamModel(modelId, messages, primarySystemPrompt, controller);
          succeeded = true;
        } catch (err) {
          if (!isRateLimitError(err)) {
            controller.enqueue(
              sseEvent({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
            );
            controller.close();
            return;
          }

          // Rate-limited — automatically try the other free models.
          // Never retries the one that just failed, never falls back
          // into search-agent. Each candidate's prompt is built fresh
          // (not once upfront) since Gemini is itself in the fallback
          // chain and needs different flags than a non-search model.
          const candidates = FALLBACK_CHAIN.filter((id) => id !== modelId);
          let lastErr: unknown = err;

          for (const candidateId of candidates) {
            try {
              const fallbackSystemPrompt = buildSystemPrompt(
                personaSettings,
                ragContext,
                false,
                isGemini(candidateId),
                modelId,
                currentDateTime,
                shiftContext,
                accountsContext
              );
              await streamModel(candidateId, messages, fallbackSystemPrompt, controller);
              actualModelId = candidateId;
              succeeded = true;
              break;
            } catch (fallbackErr) {
              lastErr = fallbackErr;
            }
          }

          if (!succeeded) {
            controller.enqueue(
              sseEvent({
                type: 'error',
                message: lastErr instanceof Error ? lastErr.message : 'All models failed',
              })
            );
            controller.close();
            return;
          }
        }

        // Client compares this to what it originally requested to decide
        // whether to prepend the "model was rate-limited" note.
        controller.enqueue(sseEvent({ type: 'done', actualModelId }));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[/api/chat]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
