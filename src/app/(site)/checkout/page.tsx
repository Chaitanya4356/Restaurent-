import type { Metadata } from 'next';
import { getDeliveryPincodes } from '@/lib/delivery-server';
import { getPublicSettings } from '@/lib/settings';
import { isValidCoordinates } from '@/lib/geo';
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
  const [pincodes, settings] = await Promise.all([getDeliveryPincodes(), getPublicSettings()]);

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

  return <CheckoutClient deliveryConfig={deliveryConfig} />;
}
