'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getCustomerUser } from '@/lib/auth/customer';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Customer profile updates (name, phone, default delivery address).
 *
 * Runs with the customer's own session, so Postgres RLS guarantees they can
 * only write their own row - no admin key involved.
 */

const profileSchema = z.object({
  fullName: z.string().trim().max(80, 'Name is too long').optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .optional()
    .or(z.literal('')),
  defaultAddress: z.string().trim().max(300, 'Address is too long').optional(),
});

export interface ProfileInput {
  fullName?: string;
  phone?: string;
  defaultAddress?: string;
}

export async function updateCustomerProfile(input: ProfileInput) {
  try {
    const user = await getCustomerUser();
    if (!user) return { success: false, error: 'Please sign in again.' };

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid details' };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: parsed.data.fullName?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        default_address: parsed.data.defaultAddress?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      if (/schema cache|does not exist/i.test(error.message)) {
        return {
          success: false,
          error:
            'The profiles table is missing. Run supabase/migrations/005_promotions_and_customer_accounts.sql first.',
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/account');
    return { success: true };
  } catch (e) {
    console.error('Failed to update customer profile:', e);
    return { success: false, error: 'Could not save your details' };
  }
}
