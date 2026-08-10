import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Keep the prompt from getting enormous — truncate very large files.
const MAX_CHARS = 40_000;

const ANALYSIS_SYSTEM_PROMPT = `You are a senior code reviewer. Given a source file, produce a structured analysis in markdown with these sections, in this order:

## Summary
2-3 sentences on what this file does.

## Potential Issues
A bullet list of bugs, edge cases, or risky patterns you notice. If none, say so.

## Suggestions
A bullet list of concrete improvements (readability, performance, safety).

## Complexity
One short paragraph: is this file simple, moderate, or complex, and why.

Be concise and specific — reference actual variable/function names from the file. Do not repeat the entire file back.`;

async function callLLM(fileName: string, language: string, content: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GROQ_API_KEY is missing. Add a real key to your .env file.');
  }

  const truncated = content.length > MAX_CHARS;
  const body = truncated ? content.slice(0, MAX_CHARS) : content;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `File: ${fileName} (${language})${truncated ? ' — truncated to first 40,000 characters' : ''}\n\n` +
            '```' +
            language +
            '\n' +
            body +
            '\n```',
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, language, content } = await req.json();

    if (!fileName || !content) {
      return NextResponse.json({ error: 'fileName and content are required.' }, { status: 400 });
    }

    const analysis = await callLLM(fileName, language || 'plaintext', content);
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[/api/analyze-file]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}