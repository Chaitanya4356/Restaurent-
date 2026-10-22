import { cache } from 'react';
import { createPublicServerClient } from '@/lib/supabase/public';
import type { DeliveryPincode } from '@/lib/delivery';

/**
 * Server-only reads for delivery configuration.
 *
 * Kept separate from `src/lib/delivery.ts` so the pure serviceability logic can
 * be imported by the browser (checkout) without pulling the Supabase client
 * into the customer bundle.
 */

/**
 * Public, cached read of the active serviceable pincodes.
 * Returns an empty array if the table does not exist yet (pre-migration),
 * which means "no restriction" rather than "no delivery".
 */
export const getDeliveryPincodes = cache(async (): Promise<DeliveryPincode[]> => {
  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from('delivery_pincodes')
      .select('pincode, area_name, is_active')
      .eq('is_active', true)
      .order('pincode', { ascending: true });

    if (error) {
      console.warn('Delivery pincodes unavailable (has the migration been run?):', error.message);
      return [];
    }

    return (data ?? []) as DeliveryPincode[];
  } catch (e) {
    console.error('Failed to load delivery pincodes:', e);
    return [];
  }
});
