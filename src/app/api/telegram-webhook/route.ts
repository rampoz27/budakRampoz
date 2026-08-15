import { NextResponse } from 'next/server';

// Next.js App Router menggunakan export POST untuk HTTP POST Request
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Cek jika ada aksi tombol (callback_query)
    if (body.callback_query) {
      const actionData = body.callback_query.data;
      const senderName = body.callback_query.from.first_name;

      console.log(`Notifikasi masuk dari ${senderName}: ${actionData}`);

      // TODO: Anda bisa menyimpan notifikasi ini ke Supabase
      // misal: await supabase.from('notifications').insert(...)

      // Memberi respon balik ke Telegram agar loading tombol berhenti
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: body.callback_query.id,
            text: 'Notifikasi berhasil terkirim!',
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
