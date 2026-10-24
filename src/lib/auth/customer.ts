import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Customer authentication (Google sign-in, ₹0 - no SMS, no OTP costs).
 *
 * This is completely separate from the staff guard: a customer account must
 * never grant access to /admin, and staff accounts are not customers.
 */

export interface CustomerUser {
  id: string;
  email: string | null;
  name: string | null;
}

export const getCustomerUser = cache(async (): Promise<CustomerUser | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) return null;

    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      null;

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name,
    };
  } catch {
    return null;
  }
});

export async function requireCustomer(nextPath = '/account'): Promise<CustomerUser> {
  const user = await getCustomerUser();

  if (!user) {
    redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

/** Only allow internal paths as a post-login destination. */
export function safeNextPath(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
