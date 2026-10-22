import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isStaffEmail } from '@/lib/auth/staff-allow-list';

/**
 * STAFF DATA ACCESS LAYER (DAL)
 * ---------------------------------------------------------------------------
 * Single source of truth for "is this request a signed-in staff member?".
 *
 * Two layers of protection, as recommended by the Next.js auth guide:
 *
 *  1. OPTIMISTIC check - `src/proxy.ts` reads the session cookie and redirects
 *     unauthenticated visitors away from `/admin/*` before the page renders.
 *     Fast, but only a UX-level gate.
 *
 *  2. SECURE check - this module calls `supabase.auth.getUser()`, which
 *     validates the JWT with the Supabase Auth server. This is the check that
 *     actually protects data, so it MUST be used in every staff page and
 *     every staff server action before touching the service-role client.
 *
 * NEVER rely on the proxy alone: it can be bypassed by calling a server
 * action endpoint directly.
 */

export interface StaffUser {
  id: string;
  email: string | null;
}

export const STAFF_LOGIN_PATH = '/admin/login';

/**
 * Resolves the current staff user from the Supabase auth session.
 * Returns `null` when there is no valid session.
 * Cached per-request so a render pass performs at most one auth round-trip.
 */
export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    // AUTHORIZATION: being signed in is not enough - the account must be on the
    // staff allow-list (see STAFF_EMAILS). Without this check, anyone who could
    // self-register would reach the service-role-backed staff actions.
    if (!isStaffEmail(data.user.email)) {
      console.warn(`Blocked staff access for unauthorised account: ${data.user.email}`);
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  } catch (e) {
    console.error('Failed to resolve staff session:', e);
    return null;
  }
});

/**
 * Secure guard for staff PAGES.
 * Redirects to the login screen when the visitor is not authenticated.
 */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffUser();

  if (!user) {
    redirect(STAFF_LOGIN_PATH);
  }

  return user;
}

/**
 * Secure guard for staff SERVER ACTIONS.
 * Returns a result object instead of throwing/redirecting so the calling
 * client component can surface a friendly error message.
 */
export async function assertStaff(): Promise<
  { ok: true; user: StaffUser } | { ok: false; error: string }
> {
  const user = await getStaffUser();

  if (!user) {
    return {
      ok: false,
      error: 'Your session has expired. Please sign in to the staff portal again.',
    };
  }

  return { ok: true, user };
}
