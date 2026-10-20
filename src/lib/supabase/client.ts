import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-side Supabase client using the public anonymous key.
 * Only public RLS-permitted tables (active categories, menu items, public settings)
 * can be accessed by this client.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
