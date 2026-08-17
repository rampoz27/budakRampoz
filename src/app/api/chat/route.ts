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
  'You are one of several AI models available inside CodeMind, a multi-model AI assistant app. The lineup includes: GPT-5.4 Mini, GPT-5.4 (both OpenAI), GPT-OSS 120B, Qwen3.6 27B, Gemini 3.6 Flash, and an AI Search Agent — users can address any of them by name in chat (e.g. "gemini, ..."), and the app can automatically switch to a different model mid-conversation if the one selected is temporarily rate-limited. These are all sibling models within the same app, not unrelated external products — if a user asks about one of the others, you DO know it exists and what it is (from this description), even though you can\'t speak on its behalf or access its internals. If you are asked what model you are, answer accurately based on what you actually are — do not assume you must be one of the OTHER names in this list just because this list exists; you are also a legitimate member of this lineup, not an outsider looking in. ' +
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
      `\n\nThe user has the following active bank accounts on file (format: Bank — Account holder name — reference code). The reference code (looks like "{{ACC-xxxxxxxx}}") is a placeholder that a separate system swaps for the real account number before the user ever sees it — you never see the actual digits, and neither does anyone else who can read this conversation. Always use the reference code EXACTLY as given (including the curly braces) in place of the number, as if it genuinely were the account number — never invent or guess a number of your own. ` +
      `Because you never see the real digits, you CANNOT reliably verify whether a number the user pastes matches one of these accounts — a reference code will never string-match a real number, so don't attempt that comparison or claim a result either way. If the user pastes numbers and asks you to check/verify/match them against saved accounts, tell them plainly to use the account verification command instead (e.g. "cocokkan rekening ini: ...") which does an exact check against the real stored numbers, rather than attempting the comparison yourself. ` +
      `For simple lookups (e.g. "what's the number for X"), just state the reference code naturally as if it were the number — never use the words "placeholder", "reference code", "token", or explain the substitution mechanism:\n\n${accountsContext}`;
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

const MODEL_MAP: Record<
  string,
  { provider: 'openai' | 'anthropic' | 'groq' | 'gemini' | 'custom-qa' | 'js-embedding'; model: string }
> = {
  'gpt-4o': { provider: 'openai', model: 'gpt-5.4-mini' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-5.4' },
  'claude-3-5-sonnet': { provider: 'anthropic', model: 'claude-sonnet-5' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'gemini-pro': { provider: 'gemini', model: 'gemini-3.6-flash' },
  'qwen-27b': { provider: 'groq', model: 'qwen/qwen3.6-27b' },
  'gpt-oss-120b-groq': { provider: 'groq', model: 'openai/gpt-oss-120b' },
  'simple-qa': { provider: 'custom-qa', model: 'simple-qa-v1' },
  'simple-qa-js': { provider: 'js-embedding', model: 'simple-qa-js-v1' },
};

const encoder = new TextEncoder();

function sseEvent(obj: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

// Beberapa model (kayak Qwen, dan kadang GPT-OSS) nulis "proses mikirnya"
// sendiri di dalam tag <think>...</think> sebelum jawaban aslinya — itu
// nggak boleh sampai kelihatan user, cuma buat "PR" internal model doang.
// Class ini nyaring itu dari aliran chunk streaming, dan aman walau tag
// pembuka/penutupnya kepotong di tengah antar 2 chunk yang beda.
class ThinkTagStripper {
  private pending = '';
  private inThink = false;

  feed(text: string): string {
    this.pending += text;
    let output = '';

    while (true) {
      if (!this.inThink) {
        const openIdx = this.pending.indexOf('<think>');
        if (openIdx === -1) {
          // Belum ketemu tag pembuka. Tahan beberapa karakter terakhir,
          // siapa tau itu awal dari "<think>" yang kepotong chunk.
          const holdBack = Math.min(this.pending.length, '<think>'.length - 1);
          const safeLen = this.pending.length - holdBack;
          if (safeLen > 0) {
            output += this.pending.slice(0, safeLen);
            this.pending = this.pending.slice(safeLen);
          }
          break;
        }
        output += this.pending.slice(0, openIdx);
        this.pending = this.pending.slice(openIdx + '<think>'.length);
        this.inThink = true;
      } else {
        const closeIdx = this.pending.indexOf('</think>');
        if (closeIdx === -1) {
          // Masih di dalam blok mikir — buang semuanya, tapi sisain
          // sedikit ekor buat jaga-jaga tag penutupnya kepotong chunk.
          const holdBack = Math.min(this.pending.length, '</think>'.length - 1);
          this.pending = this.pending.slice(this.pending.length - holdBack);
          break;
        }
        this.pending = this.pending.slice(closeIdx + '</think>'.length);
        this.inThink = false;
      }
    }

    return output;
  }

  // WAJIB dipanggil pas stream udah beneran selesai — feed() sengaja
  // nahan beberapa karakter terakhir tiap kali (jaga-jaga tag kepotong
  // antar chunk), jadi tanpa ini, ekor SETIAP respons bakal ke-potong
  // diam-diam, bukan cuma yang beneran ada blok <think>-nya.
  flush(): string {
    if (this.inThink) {
      // Stream berakhir di tengah blok mikir (nggak wajar/rusak) — nggak
      // ada yang aman buat dikeluarin dari situ.
      this.pending = '';
      return '';
    }
    const rest = this.pending;
    this.pending = '';
    return rest;
  }
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
  const thinkStripper = new ThinkTagStripper();

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
        if (delta) {
          const visible = thinkStripper.feed(delta);
          if (visible) controller.enqueue(sseEvent({ type: 'chunk', text: visible }));
        }
      } catch {
        // ignore a malformed/partial SSE line
      }
    }
  }

  const remaining = thinkStripper.flush();
  if (remaining) controller.enqueue(sseEvent({ type: 'chunk', text: remaining }));
}

// Same SSE chunk format as Groq — OpenAI's chat completions API is what
// Groq's endpoint deliberately mimics, so the parsing logic is identical.
async function streamOpenAI(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
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
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${errText}`);
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

// Calls the user's own self-hosted Q&A API (a TF-IDF matcher, not a real
// LLM — see the simple-ai-qa project). It doesn't stream token-by-token,
// it just answers instantly, so we send its whole answer as a single SSE
// chunk — the client can't tell the difference. It also has no concept
// of persona/context/conversation history, so systemPrompt is unused —
// only the user's latest message is sent.
async function streamCustomQA(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController
): Promise<void> {
  const apiUrl = process.env.SIMPLE_QA_API_URL;
  if (!apiUrl) {
    throw new Error('SIMPLE_QA_API_URL is missing. Add it to your .env file.');
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message found to ask.');
  }

  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: lastUserMessage.content }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Simple Q&A API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const confidencePercent = Math.round((data.confidence ?? 0) * 100);
  const text =
    data.confidence >= 0.3 && data.matched_question
      ? `${data.answer}\n\n_(cocok ${confidencePercent}% dengan pertanyaan yang aku pelajari: "${data.matched_question}")_`
      : data.answer;

  controller.enqueue(sseEvent({ type: 'chunk', text }));
}

// Same idea as streamCustomQA, but for the Transformers.js version — no
// Calls the SEPARATE Simple Q&A JS service (its own Render deployment,
// NOT part of CodeMind's own process). This is deliberate — running the
// embedding model inside CodeMind's own process previously caused an
// out-of-memory crash that took down all of CodeMind, not just this
// feature (Render free tier's 512MB limit). Running it as an isolated
// service means a crash there only breaks this one model, never CodeMind
// itself.
async function streamJsEmbeddingQA(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController
): Promise<void> {
  const apiUrl = process.env.SIMPLE_QA_JS_API_URL;
  if (!apiUrl) {
    throw new Error('SIMPLE_QA_JS_API_URL is missing. Add it to your .env file.');
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    throw new Error('No user message found to ask.');
  }

  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: lastUserMessage.content }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Simple Q&A JS API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const confidencePercent = Math.round((data.confidence ?? 0) * 100);
  const text = data.matched_question
    ? `${data.answer}\n\n_(cocok ${confidencePercent}% dengan: "${data.matched_question}" — embedding: ${Math.round(
        (data.embedding_score ?? 0) * 100
      )}%, TF-IDF: ${Math.round((data.tfidf_score ?? 0) * 100)}%)_`
    : data.answer;

  controller.enqueue(sseEvent({ type: 'chunk', text }));
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
  if (mapped.provider === 'openai') return streamOpenAI(messages, mapped.model, systemPrompt, controller);
  if (mapped.provider === 'gemini') return streamGemini(messages, mapped.model, systemPrompt, controller);
  if (mapped.provider === 'custom-qa') return streamCustomQA(messages, controller);
  if (mapped.provider === 'js-embedding') return streamJsEmbeddingQA(messages, controller);
  throw new Error(`Streaming isn't implemented for provider "${mapped.provider}" yet (no API key configured anyway).`);
}

// Every stream*() function above throws `Error("<Provider> error (<status>): ...")`
// on a non-OK response — checking for "(429)"/"(413)" is a simple way to
// tell "rate limited / request too large" apart from other failures.
function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('(429)') || err.message.includes('(413)');
}

// simple-qa is a personal, hobby-hosted service (e.g. Render free tier,
// which sleeps when idle and can time out on cold start) — much less
// reliable than the real providers. Any failure from it is worth falling
// back on, not just rate-limit-shaped ones.
function shouldFallback(modelId: string, err: unknown): boolean {
  return modelId === 'simple-qa' || modelId === 'simple-qa-js' || isRateLimitError(err);
}

// Free-tier models only, in preference order. 'search-agent' — and the
// commented-out paid OpenAI/Anthropic models — are deliberately excluded.
const FALLBACK_CHAIN = ['qwen-27b', 'gpt-oss-120b-groq', 'gemini-pro'];

// simple-qa (Python/TF-IDF) and simple-qa-js (Transformers.js) are two
// independent implementations of the SAME homemade Q&A bot. If one is
// down, try the other FIRST — they act as one combined "buatan sendiri"
// tier — before falling through to the big providers.
const CUSTOM_QA_SIBLING: Record<string, string> = {
  'simple-qa': 'simple-qa-js',
  'simple-qa-js': 'simple-qa',
};

function getFallbackCandidates(modelId: string): string[] {
  const base = FALLBACK_CHAIN.filter((id) => id !== modelId);
  const sibling = CUSTOM_QA_SIBLING[modelId];
  if (sibling) return [sibling, ...base];
  return base;
}

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
        let fallbackReason: string | undefined;

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
          if (!shouldFallback(modelId, err)) {
            controller.enqueue(
              sseEvent({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
            );
            controller.close();
            return;
          }

          // Remember WHY the primary model failed — not every fallback is
          // an actual rate limit (e.g. simple-qa falls back on any error,
          // including "not configured" or "unreachable"), so the client
          // needs the real reason to avoid mislabeling it.
          fallbackReason = err instanceof Error ? err.message : 'Unknown error';

          // Automatically try the other free models. Never retries the
          // one that just failed, never falls back into search-agent.
          // Each candidate's prompt is built fresh (not once upfront)
          // since Gemini is itself in the fallback chain and needs
          // different flags than a non-search model.
          const candidates = getFallbackCandidates(modelId);
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
            const triedNames = [modelId, ...candidates].join(', ');
            const friendlyMessage = isRateLimitError(lastErr)
              ? `Semua model gratis lagi penuh/kena limit saat ini (dicoba: ${triedNames}). Coba lagi dalam beberapa menit, atau tunggu reset limit hariannya.`
              : `Gagal menghubungi semua model yang dicoba (${triedNames}). Detail teknis: ${
                  lastErr instanceof Error ? lastErr.message : 'Unknown error'
                }`;
            controller.enqueue(sseEvent({ type: 'error', message: friendlyMessage }));
            controller.close();
            return;
          }
        }

        // Client compares actualModelId to what it originally requested
        // to decide whether to show a fallback note, and uses
        // fallbackReason to phrase it accurately (rate limit vs. simply
        // unreachable/misconfigured).
        controller.enqueue(sseEvent({ type: 'done', actualModelId, fallbackReason }));
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
