import { NextRequest, NextResponse } from 'next/server';

// Selalu pakai model gratis-generous (Groq) buat proses ini — jangan
// sampai fitur otomatis kayak gini diam-diam makan jatah 50 RPD GPT.
async function callGroqForPath(topic: string): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    throw new Error('GROQ_API_KEY is missing.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'system',
          content:
            'You break a broad learning topic into 5-8 focused subtopics for a study plan. ' +
            'Respond ONLY with a JSON array of short subtopic name strings, nothing else, no markdown formatting, no explanation. ' +
            'Example for topic "Python": ["Variabel dan Tipe Data", "Function", "List dan Dictionary", "Loop", "Error Handling", "OOP Dasar"]',
        },
        { role: 'user', content: `Topik: ${topic}` },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';

  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    }
    return [];
  } catch {
    throw new Error('Gagal parse daftar sub-topik dari respons AI.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'Topik nggak boleh kosong.' }, { status: 400 });
    }

    const subtopics = await callGroqForPath(topic.trim());
    if (subtopics.length === 0) {
      return NextResponse.json({ error: 'AI nggak berhasil bikin sub-topik. Coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ subtopics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/auto-learn/generate-path]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
