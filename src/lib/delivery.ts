import { cache } from 'react';
import { createPublicServerClient } from '@/lib/supabase/public';

/**
 * Delivery serviceability
 * ---------------------------------------------------------------------------
 * The owner maintains an allow-list of pincodes in /admin/settings. This is how
 * a restaurant's delivery area actually works in practice, and it costs nothing
 * and never fails the way address geocoding does.
 *
 * Rules:
 *   * allow-list EMPTY  -> delivery is open to every address (safe default)
 *   * allow-list has rows -> only those pincodes may place a DELIVERY order
 *   * pickup orders are never restricted
 */

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export interface DeliveryPincode {
  pincode: string;
  area_name: string | null;
  is_active: boolean;
}

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

/**
 * True when the pincode may receive a delivery order.
 * An empty allow-list means "not configured yet", so everything is allowed.
 */
export function isPincodeServiceable(
  pincode: string,
  allowedPincodes: Array<{ pincode: string }>
): boolean {
  if (allowedPincodes.length === 0) return true;
  return allowedPincodes.some((entry) => entry.pincode === pincode);
}
