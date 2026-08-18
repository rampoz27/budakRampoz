import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message, currentDateTime } = (await req.json()) as {
      message: string;
      currentDateTime: string;
    };

    if (!message) {
      return NextResponse.json({ action: 'none', label: '', alarmDateTime: '' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({ action: 'none', label: '', alarmDateTime: '' });
    }

    const systemPrompt = `You classify whether a chat message is asking to set a reminder/alarm. Respond with STRICT JSON only, no other text: {"action": "set_alarm" | "none", "label": string, "alarmDateTime": string}

Rules:
- "set_alarm": the user wants to be reminded about something at a specific time — absolute ("jam 3 sore", "besok jam 9 pagi") or relative ("30 menit lagi", "dalam 2 jam"). Resolve the time into an exact datetime using the current date/time below as your reference point.
- "label" = a short description of what to remind them about (in the same language the user used).
- "alarmDateTime" = the resolved datetime as a full ISO 8601 string with timezone offset matching the current time given below. It MUST be in the future relative to the current time — if the stated time has already passed today, assume they mean the next occurrence (e.g. tomorrow).
- "none": the message isn't asking to set a reminder/alarm at all, or you can't confidently resolve a time. When unsure, prefer "none".

Current date and time: ${currentDateTime}`;

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
          { role: 'user', content: message },
        ],
        temperature: 0,
        reasoning_effort: 'none', // Qwen3 khusus: matiin reasoning sama sekali, biar nggak
        // nulis blok <think> yang bentrok sama validasi JSON Groq sendiri
        // (classifier ini butuh JSON bersih, bukan proses mikir yang keliatan)
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.error('[/api/classify-alarm-intent] LLM call failed', await res.text());
      return NextResponse.json({ action: 'none', label: '', alarmDateTime: '' });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    // Beberapa model (Qwen, dkk) suka nulis proses "mikir"-nya sendiri
    // dalam tag <think>...</think> SEBELUM JSON aslinya, walau udah
    // diminta JSON mode — itu bikin JSON.parse gagal total kalau nggak
    // dibuang dulu, dan gagalnya SELALU jatuh diam-diam ke default 'none'.
    const cleanedRaw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() || raw;

    let parsed: { action?: string; label?: string; alarmDateTime?: string };
    try {
      parsed = JSON.parse(cleanedRaw);
    } catch {
      console.error('[/api/classify-alarm-intent] Failed to parse model output as JSON:', raw);
      parsed = {};
    }

    return NextResponse.json({
      action: parsed.action === 'set_alarm' ? 'set_alarm' : 'none',
      label: parsed.label ?? '',
      alarmDateTime: parsed.alarmDateTime ?? '',
    });
  } catch (err) {
    console.error('[/api/classify-alarm-intent]', err);
    return NextResponse.json({ action: 'none', label: '', alarmDateTime: '' });
  }
}
