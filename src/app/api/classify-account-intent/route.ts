import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message: string };

    if (!message) {
      return NextResponse.json({ action: 'none', bankName: '', holderName: '', accountNumber: '' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({ action: 'none', bankName: '', holderName: '', accountNumber: '' });
    }

    const systemPrompt = `You classify whether a chat message is providing bank account details to save. Respond with STRICT JSON only, no other text: {"action": "add" | "none", "bankName": string, "holderName": string, "accountNumber": string}

Rules:
- "add": the user is giving a bank name, account holder name, and account number to save as a new account. Extract all three fields as accurately as possible from however they're phrased.
- "accountNumber" must contain digits only (strip spaces, dashes, or other punctuation).
- "none": the message is missing the account number, the bank name, or the holder name, or isn't providing account details to save at all. When any required field is missing or unsure, prefer "none" — it's much safer to ask again than to save incomplete or wrong data.`;

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
      console.error('[/api/classify-account-intent] LLM call failed', await res.text());
      return NextResponse.json({ action: 'none', bankName: '', holderName: '', accountNumber: '' });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    let parsed: { action?: string; bankName?: string; holderName?: string; accountNumber?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      action: parsed.action === 'add' ? 'add' : 'none',
      bankName: parsed.bankName ?? '',
      holderName: parsed.holderName ?? '',
      accountNumber: parsed.accountNumber ?? '',
    });
  } catch (err) {
    console.error('[/api/classify-account-intent]', err);
    return NextResponse.json({ action: 'none', bankName: '', holderName: '', accountNumber: '' });
  }
}
