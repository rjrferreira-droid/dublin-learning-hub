import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const fallbackPublishableKey = 'sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;

// The publishable key is intentionally client-safe. Never place service-role,
// OpenAI, LiveKit secret, or other privileged credentials in this frontend.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
