import { NextResponse } from 'next/server';

export async function GET() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Simpan Chat ID Anda di .env / Render Env

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: CHAT_ID,
    text: '🎛️ **Control Panel Notifikasi**\nKlik tombol di bawah untuk memicu notifikasi ke Web Render:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Jobdesk Finished', callback_data: 'Jobdesk Selesai' },
          { text: '⚠️ Need Review', callback_data: 'Perlu Review' },
        ],
        [
          { text: '🔥 Alarm Trigger', callback_data: 'Bahaya/Alarm Aktif' },
        ],
      ],
    },
  };

  try {
    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send buttons' }, { status: 500 });
  }
}
