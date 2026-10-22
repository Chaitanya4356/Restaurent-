import type { Metadata } from 'next';
import { getDeliveryPincodes } from '@/lib/delivery';
import { CheckoutClient } from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout | Josh Restaurant',
  description: 'Complete your delivery or pickup order at Josh Restaurant, Visakhapatnam.',
  // A checkout page must never be indexed.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Server wrapper: loads the owner's serviceable pincode list so the checkout
 * form can tell the customer straight away whether we deliver to them.
 * The authoritative check still runs server-side inside placeOrder().
 */
export default async function CheckoutPage() {
  const pincodes = await getDeliveryPincodes();

  return <CheckoutClient allowedPincodes={pincodes.map((entry) => entry.pincode)} />;
}
