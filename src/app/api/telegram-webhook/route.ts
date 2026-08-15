import { NextResponse } from 'next/server';

// 1. Tambahkan ini agar saat dibuka di browser (GET Request) tidak 405
export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    message: 'Telegram Webhook API is running!' 
  }, { status: 200 });
}

// 2. Ini tetap digunakan oleh Telegram saat tombol diklik (POST Request)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.callback_query) {
      const actionData = body.callback_query.data;
      const senderName = body.callback_query.from.first_name;

      console.log(`Notifikasi masuk dari ${senderName}: ${actionData}`);

      // Balas ke Telegram agar loading di tombol berhenti
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: body.callback_query.id,
            text: 'Notifikasi berhasil terkirim ke Web!',
          }),
        }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
