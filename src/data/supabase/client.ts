import type { SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/config/env';

let pending: Promise<SupabaseClient> | null = null;

/** Loads supabase-js only when a backend is configured, keeping it out of the main bundle otherwise. */
export function loadSupabase(): Promise<SupabaseClient> | null {
  if (!isSupabaseConfigured) return null;
  pending ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  );
  return pending;
}
