import { createClient } from '@supabase/supabase-js';

/**
 * Creates a privileged admin Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 * CRITICAL SECURITY RULE:
 * This client must ONLY be imported and called inside Server Actions or Route Handlers.
 * NEVER expose the service role key to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
