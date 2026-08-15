'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Sesuaikan path client Supabase Anda

export default function TelegramListener() {
  useEffect(() => {
    // 1. Minta Izin Web Notification Browser
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // 2. Subscribe ke Supabase Realtime
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new;

          // 3. Tampilkan Notifikasi Browser Native
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/favicon.ico', // Bebas ganti icon
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // Komponen ini berjalan di background tanpa render UI
}
