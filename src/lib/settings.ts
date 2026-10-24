import { cache } from 'react';
import { createPublicServerClient } from '@/lib/supabase/public';
import type { RestaurantSettings } from '@/types/database';

/**
 * Public restaurant settings (safe for anonymous visitors - RLS allows SELECT
 * on `restaurant_settings`).
 *
 * This is the single source of truth for anything the owner can change in
 * `/admin/settings`: delivery fees, free-delivery threshold, minimum order,
 * phone number, address and brand colour. The storefront must never hardcode
 * these values again, otherwise the cart can quote one total while the server
 * charges another.
 */

export const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 1,
  restaurant_name: 'Josh',
  phone_number: '+91 98765 43210',
  address: 'Beach Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003',
  city: 'Visakhapatnam',
  time_zone: 'Asia/Kolkata',
  opening_time: '07:00:00',
  closing_time: '23:00:00',
  order_cutoff_minutes: 20,
  is_accepting_orders: true,
  delivery_fee_paise: 4000,
  free_delivery_threshold_paise: 50000,
  min_delivery_order_paise: 10000,
  delivery_radius_km: 20,
  outlet_latitude: null,
  outlet_longitude: null,
  prep_time_minutes: 25,
  avg_speed_kmh: 18,
  brand_color_primary: '#E65100',
  brand_logo_url: null,
  brand_favicon_url: null,
  upi_id: null,
  upi_phone: null,
  upi_qr_url: null,
  upi_payee_name: null,
};

/**
 * Loads the live public settings, falling back to platform defaults if the
 * database is unreachable so the storefront never hard-fails.
 * Cached per request - multiple pages/layouts share one query.
 */
export const getPublicSettings = cache(async (): Promise<RestaurantSettings> => {
  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('Failed to load restaurant settings:', error);
      return DEFAULT_SETTINGS;
    }

    return { ...DEFAULT_SETTINGS, ...(data as Partial<RestaurantSettings>) };
  } catch (e) {
    console.error('Unexpected error loading restaurant settings:', e);
    return DEFAULT_SETTINGS;
  }
});
