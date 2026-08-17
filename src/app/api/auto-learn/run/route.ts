import { NextRequest, NextResponse } from 'next/server';

// Model gratis-generous yang dirotasi biar nggak numpuk ke 1 provider
// doang. GPT-5.4/mini SENGAJA nggak dimasukin — proses ini bisa manggil
// AI puluhan kali per sesi, jangan sampai diam-diam ngabisin jatah 50 RPD.
const ROTATION = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'] as const;

async function callGroq(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
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
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function generateQuestions(model: string, subtopicName: string, count: number): Promise<string[]> {
  const content = await callGroq(
    model,
    'You generate short, specific quiz-style questions about a subtopic, in Indonesian. ' +
      'Respond ONLY with a JSON array of question strings, nothing else, no markdown formatting.',
    `Sub-topik: "${subtopicName}". Bikin ${count} pertanyaan berbeda soal ini.`
  );
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

async function answerQuestion(model: string, question: string): Promise<string> {
  return callGroq(
    model,
    'You answer questions concisely and accurately, in Indonesian. 2-4 sentences, no fluff.',
    question
  );
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiUrl = process.env.SIMPLE_QA_JS_API_URL;
  if (!apiUrl) {
    throw new Error('SIMPLE_QA_JS_API_URL is missing.');
  }
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embed service error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.embedding;
}

interface SubtopicInput {
  id: string;
  subtopic_name: string;
  target_count: number;
  learned_count: number; // udah berapa yang kepelajarin sebelumnya
}

export async function POST(req: NextRequest) {
  try {
    const { topicId, subtopics } = (await req.json()) as {
      topicId: string;
      subtopics: SubtopicInput[];
    };

    if (!topicId || !Array.isArray(subtopics) || subtopics.length === 0) {
      return NextResponse.json({ error: 'topicId dan subtopics wajib diisi.' }, { status: 400 });
    }

    const results: Array<{
      subtopicId: string;
      question: string;
      answer: string;
      embedding: number[];
      sourceModel: string;
      skippedAsDuplicate: boolean;
    }> = [];

    let modelIndex = 0;
    const nextModel = () => {
      const m = ROTATION[modelIndex % ROTATION.length];
      modelIndex += 1;
      return m;
    };

    for (const subtopic of subtopics) {
      const remaining = subtopic.target_count - subtopic.learned_count;
      if (remaining <= 0) continue; // udah selesai, skip

      const genModel = nextModel();
      const questions = await generateQuestions(genModel, subtopic.subtopic_name, remaining);

      for (const question of questions) {
        const answerModel = nextModel();
        const answer = await answerQuestion(answerModel, question);
        const embedding = await getEmbedding(question);

        results.push({
          subtopicId: subtopic.id,
          question,
          answer,
          embedding,
          sourceModel: answerModel,
          skippedAsDuplicate: false, // dedup check dilakuin di client sebelum save, pakai findSimilarKnowledge
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/auto-learn/run]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
