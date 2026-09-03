import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const fallbackPublishableKey = 'sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';

type RuntimeImportMeta = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

const viteEnv = (import.meta as RuntimeImportMeta).env ?? {};
const isBrowser = typeof window !== 'undefined';

export const supabaseUrl =
  typeof viteEnv.VITE_SUPABASE_URL === 'string' && viteEnv.VITE_SUPABASE_URL
    ? viteEnv.VITE_SUPABASE_URL
    : fallbackUrl;
export const supabasePublishableKey =
  typeof viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' && viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY
    ? viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY
    : fallbackPublishableKey;

// The publishable key is intentionally client-safe. Never place service-role,
// OpenAI, LiveKit secret, or other privileged credentials in this frontend.
// Browser-only session persistence keeps pure Node/Playwright module tests safe.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});
