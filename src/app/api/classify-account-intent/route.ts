import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message } = (await req.json()) as { message: string };

    if (!message) {
      return NextResponse.json({ action: 'none', accounts: [] });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({ action: 'none', accounts: [] });
    }

    const systemPrompt = `You classify whether a chat message is providing bank account details to save — possibly MULTIPLE accounts at once (e.g. a pasted list or table with many rows). Respond with STRICT JSON only, no other text: {"action": "add" | "none", "accounts": [{"bankName": string, "holderName": string, "accountNumber": string}]}

Rules:
- "add": the user is giving one or more complete bank accounts (bank name + account holder name + account number) to save. Extract EVERY account found in the message into the "accounts" array — a pasted table or list with many rows should produce one array entry per row, not just the first one.
- Each "accountNumber" must contain digits only (strip spaces, dashes, or other punctuation).
- Skip any row that's missing the bank name, holder name, or number entirely — don't guess or invent missing fields for it.
- "none": no complete account was found anywhere in the message. In that case "accounts" should be an empty array.`;

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
      console.error('[/api/classify-account-intent] LLM call failed', await res.text());
      return NextResponse.json({ action: 'none', accounts: [] });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    // Beberapa model (Qwen, dkk) suka nulis proses "mikir"-nya sendiri
    // dalam tag <think>...</think> SEBELUM JSON aslinya, walau udah
    // diminta JSON mode — itu bikin JSON.parse gagal total kalau nggak
    // dibuang dulu, dan gagalnya SELALU jatuh diam-diam ke default 'none'.
    const cleanedRaw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() || raw;

    let parsed: {
      action?: string;
      accounts?: Array<{ bankName?: string; holderName?: string; accountNumber?: string }>;
    };
    try {
      parsed = JSON.parse(cleanedRaw);
    } catch {
      console.error('[/api/classify-account-intent] Failed to parse model output as JSON:', raw);
      parsed = {};
    }

    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts
          .filter((a) => a.bankName && a.holderName && a.accountNumber)
          .map((a) => ({
            bankName: a.bankName as string,
            holderName: a.holderName as string,
            accountNumber: a.accountNumber as string,
          }))
      : [];

    return NextResponse.json({
      action: parsed.action === 'add' && accounts.length > 0 ? 'add' : 'none',
      accounts,
    });
  } catch (err) {
    console.error('[/api/classify-account-intent]', err);
    return NextResponse.json({ action: 'none', accounts: [] });
  }
}
