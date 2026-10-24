import type { Metadata } from 'next';
import { getDeliveryPincodes } from '@/lib/delivery-server';
import { getPublicSettings } from '@/lib/settings';
import { isValidCoordinates } from '@/lib/geo';
import { getCustomerUser } from '@/lib/auth/customer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CheckoutClient, type CheckoutDeliveryConfig } from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout | Josh Restaurant',
  description: 'Complete your delivery or pickup order at Josh Restaurant, Visakhapatnam.',
  // A checkout page must never be indexed.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Server wrapper: loads the owner's serviceable pincodes, delivery radius and
 * outlet location so the checkout can give instant feedback about delivery
 * eligibility and the estimated delivery time.
 * The authoritative checks still run server-side inside placeOrder().
 */
export default async function CheckoutPage() {
  const [pincodes, settings, user] = await Promise.all([
    getDeliveryPincodes(),
    getPublicSettings(),
    getCustomerUser(),
  ]);

  // Signed-in customers start with their saved name / phone / address.
  let defaults: { name: string; phone: string; address: string } | null = null;
  if (user) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, default_address')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        defaults = {
          name: profile.full_name ?? user.name ?? '',
          phone: profile.phone ?? '',
          address: profile.default_address ?? '',
        };
      }
    } catch {
      // never block checkout on a profile lookup
    }
  }

  const outlet =
    settings.outlet_latitude != null && settings.outlet_longitude != null
      ? { latitude: settings.outlet_latitude, longitude: settings.outlet_longitude }
      : null;

  const deliveryConfig: CheckoutDeliveryConfig = {
    allowedPincodes: pincodes.map((entry) => entry.pincode),
    radiusKm: settings.delivery_radius_km ?? 20,
    outlet: isValidCoordinates(outlet) ? outlet : null,
    prepTimeMinutes: settings.prep_time_minutes ?? 25,
    avgSpeedKmh: settings.avg_speed_kmh ?? 18,
  };

  return <CheckoutClient deliveryConfig={deliveryConfig} defaults={defaults} />;
}
