import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// gemini-embedding-001 is the current stable, generally-available Gemini
// embedding model. Output is truncated to 768 dimensions (Google's
// recommended size) to keep storage and search cheap without meaningfully
// hurting quality (see Google's own MTEB benchmark: 768-dim scores 67.99
// vs 68.16 for the full 3072-dim output).
const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONS = 768;

type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export async function POST(req: NextRequest) {
  try {
    const { text, taskType } = (await req.json()) as { text: string; taskType?: TaskType };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'text is required.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing. Add a real key to your .env file.' },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          taskType: taskType || 'RETRIEVAL_DOCUMENT',
          content: { parts: [{ text }] },
          outputDimensionality: OUTPUT_DIMENSIONS,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const embedding: number[] = data.embedding?.values ?? [];

    if (embedding.length === 0) {
      throw new Error('Embedding API returned no values.');
    }

    return NextResponse.json({ embedding });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[/api/embed]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
