import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client'; // Sesuaikan path client Supabase Anda

export async function GET() {
  return NextResponse.json({ status: 'online', message: 'Telegram Webhook API is running!' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // =========================================================
    // KASUS 1: USER KIRIM PESAN BIASA (Misal: /start atau "Halo")
    // =========================================================
    if (body.message) {
      const chatId = body.message.chat.id; // <--- CHAT ID OTOMATIS DIDAPAT DI SINI
      const senderName = body.message.from.first_name;
      const userText = body.message.text;

      console.log(`Pesan masuk dari ${senderName} (Chat ID: ${chatId}): "${userText}"`);

      // Kirim pesan balasan beserta MENU TOMBOL langsung ke Chat ID tersebut
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId, // Menggunakan Chat ID pengirim
            text: `Halo *${senderName}*! 👋\nChat ID kamu adalah: \`${chatId}\`\n\n_Klik tombol di bawah untuk memicu notifikasi ke Web:_`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Jobdesk Finished', callback_data: 'Jobdesk Selesai' },
                  { text: '⚠️ Need Review', callback_data: 'Perlu Review' },
                ],
                [
                  { text: '🔥 Alarm Trigger', callback_data: 'Bahaya/Alarm Aktif' },
                  { text: '☕ Break Time', callback_data: 'Istirahat/Break' },
                ],
              ],
            },
          }),
        }
      );
    }

    // =========================================================
    // KASUS 2: USER MENGKLIK TOMBOL (INLINE KEYBOARD)
    // =========================================================
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const actionData = callbackQuery.data;
      const senderName = callbackQuery.from.first_name;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      // 1. Simpan Notifikasi ke Supabase (Trigger Realtime ke Web Browser)
      await supabase.from('notifications').insert([
        {
          title: `Notifikasi dari ${senderName}`,
          message: `Aksi: ${actionData}`,
        },
      ]);

      // 2. Hilangkan indikator loading di tombol Telegram
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: `Notifikasi "${actionData}" terkirim ke Web!`,
          }),
        }
      );

      // 3. Edit pesan lama untuk update UI tombol (Loop Menu)
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `🎛️ **Control Panel Notifikasi**\nTerakhir diklik: *${actionData}* oleh ${senderName}\n\n_Klik tombol di bawah untuk kirim lagi:_`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Jobdesk Finished', callback_data: 'Jobdesk Selesai' },
                  { text: '⚠️ Need Review', callback_data: 'Perlu Review' },
                ],
                [
                  { text: '🔥 Alarm Trigger', callback_data: 'Bahaya/Alarm Aktif' },
                  { text: '☕ Break Time', callback_data: 'Istirahat/Break' },
                ],
              ],
            },
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
