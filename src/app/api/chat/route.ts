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
}

const SYSTEM_PROMPT =
  'You are CodeMind, an AI coding assistant. Help developers debug, brainstorm, refactor, and review code. Use fenced code blocks with a language tag (e.g. ```tsx) whenever you include code. Be concise and practical.';

// Maps the model ids used in the UI to the real model id each provider expects.
// 'search-agent' is special-cased below — it's not a single provider call,
// it's the 2-step pipeline defined in src/lib/ai/search-agent.ts.
const MODEL_MAP: Record<
  string,
  { provider: 'openai' | 'anthropic' | 'gemini' | 'groq'; model: string }
> = {
  'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo' },
  'claude-3-5-sonnet': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  'gemini-pro': { provider: 'gemini', model: 'gemini-1.5-pro' },
  'llama-3.3-70b': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'gpt-oss-120b-groq': { provider: 'groq', model: 'openai/gpt-oss-120b' },
};

async function callOpenAI(messages: ChatMessage[], model: string) {
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
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGroq(messages: ChatMessage[], model: string) {
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
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(messages: ChatMessage[], model: string) {
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
      system: SYSTEM_PROMPT,
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

async function callGemini(messages: ChatMessage[], model: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GEMINI_API_KEY is missing. Add a real key to your .env file.');
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { modelId, messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // The search agent is a pipeline, not a single provider call — handle
    // it separately before touching MODEL_MAP.
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

    let content: string;
    if (mapped.provider === 'openai') {
      content = await callOpenAI(messages, mapped.model);
    } else if (mapped.provider === 'anthropic') {
      content = await callAnthropic(messages, mapped.model);
    } else if (mapped.provider === 'groq') {
      content = await callGroq(messages, mapped.model);
    } else {
      content = await callGemini(messages, mapped.model);
    }

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[/api/chat]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}