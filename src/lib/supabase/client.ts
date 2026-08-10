import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  // Fails loudly in dev if .env is missing the Supabase keys, instead of
  // silently sending requests to "undefined".
  console.warn(
    'Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);