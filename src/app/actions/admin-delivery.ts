'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertStaff } from '@/lib/auth/require-staff';
import { PINCODE_PATTERN } from '@/lib/delivery';
import { revalidatePath } from 'next/cache';

/**
 * Staff server actions for the delivery serviceability allow-list.
 * Every action uses the service-role client, so each one is guarded.
 */

const pincodeSchema = z.object({
  pincode: z.string().trim().regex(PINCODE_PATTERN, 'Enter a valid 6-digit Indian pincode'),
  areaName: z.string().trim().max(80, 'Area name is too long').optional(),
});

export async function addDeliveryPincode(input: { pincode: string; areaName?: string }) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = pincodeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid pincode' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('delivery_pincodes').upsert(
      {
        pincode: parsed.data.pincode,
        area_name: parsed.data.areaName?.trim() || null,
        is_active: true,
      },
      { onConflict: 'pincode' }
    );

    if (error) {
      if (/does not exist/i.test(error.message)) {
        return {
          success: false,
          error:
            'The delivery pincodes table is missing. Run supabase/migrations/002_delivery_pincodes.sql in the Supabase SQL editor first.',
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/checkout');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (e) {
    console.error('Failed to add delivery pincode:', e);
    return { success: false, error: 'Failed to add pincode' };
  }
}

export async function removeDeliveryPincode(pincode: string) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!PINCODE_PATTERN.test(pincode)) {
      return { success: false, error: 'Invalid pincode' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('delivery_pincodes').delete().eq('pincode', pincode);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/checkout');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (e) {
    console.error('Failed to remove delivery pincode:', e);
    return { success: false, error: 'Failed to remove pincode' };
  }
}
