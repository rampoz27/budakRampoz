import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface TaskRef {
  id: string;
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, tasks } = (await req.json()) as { message: string; tasks: TaskRef[] };

    if (!message || !tasks || tasks.length === 0) {
      return NextResponse.json({ action: 'none', taskIds: [] });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({ action: 'none', taskIds: [] });
    }

    const taskList = tasks.map((t) => `- id: ${t.id} | text: ${t.text}`).join('\n');

    const systemPrompt = `You classify whether a chat message is a command to mark one or more work tasks (jobdesk) as complete. Respond with STRICT JSON only, no other text: {"action": "complete" | "none", "taskIds": string[]}

Rules:
- "complete": the user is saying one or more of the listed tasks are done/finished. Match by MEANING, not exact wording — the user will usually paraphrase, not quote the task text exactly. "taskIds" = the id(s) of the matching task(s).
- "none": the message doesn't clearly mark a specific task complete (a question, unrelated chat, or nothing matches well). When unsure, prefer "none" — it's much safer to ask again than to silently check off the wrong task.

Current task list:
${taskList}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.error('[/api/classify-jobdesk-intent] LLM call failed', await res.text());
      return NextResponse.json({ action: 'none', taskIds: [] });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: { action?: string; taskIds?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      action: parsed.action === 'complete' ? 'complete' : 'none',
      taskIds: Array.isArray(parsed.taskIds) ? parsed.taskIds : [],
    });
  } catch (err) {
    console.error('[/api/classify-jobdesk-intent]', err);
    return NextResponse.json({ action: 'none', taskIds: [] });
  }
}
