import { createClient } from '@supabase/supabase-js';

// Mord Hive borrows Mordheim Manager's Supabase project but keeps every table in
// its own `mordhive` schema (supabase/migrations/mh_0001_mordhive_schema.sql), so
// nothing here can read or write MM's `public` tables by accident: the client is
// pinned to that schema. Auth (auth.users) is shared — one account, both apps.
//
// The URL and publishable key are public by design (RLS is the security
// boundary), so they're baked in as defaults; VITE_SUPABASE_* overrides them for
// a local stack or a branch.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://gkrekytyfvqyqubrsnov.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_rkIH7OUAcowhi_x0SlVybA_h0nWm3-S';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'mordhive' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Own key so a session here never collides with Mordheim Manager's, even if
    // both were ever served from one origin.
    storageKey: 'mordhive.auth',
  },
});

/** Where Supabase sends the user back to after a password-reset email. */
export function resetRedirectUrl(): string {
  return `${window.location.origin}/reset-password`;
}
