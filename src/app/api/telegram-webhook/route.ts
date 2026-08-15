import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client'; // Sesuaikan path client Supabase Anda

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.callback_query) {
      const actionData = body.callback_query.data;
      const senderName = body.callback_query.from.first_name;

      // 1. Simpan Notifikasi ke Supabase
      const { error } = await supabase.from('notifications').insert([
        {
          title: `Notifikasi dari ${senderName}`,
          message: `Aksi: ${actionData}`,
        },
      ]);

      if (error) console.error('Error insert to Supabase:', error);

      // 2. Balas ke Telegram
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: body.callback_query.id,
            text: 'Notifikasi dikirim ke Web!',
          }),
        }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
