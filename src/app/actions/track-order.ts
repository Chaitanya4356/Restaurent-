'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTrackingToken } from '@/lib/tracking';

/**
 * Public order lookup for the `/track` page.
 *
 * SECURITY: orders cannot be read anonymously (RLS), so this action reads with
 * the service-role client - but only returns the signed tracking token after
 * BOTH the order number and the phone number used at checkout match. A wrong
 * order number, a wrong phone, and a non-existent order all return the same
 * generic message so the endpoint cannot be used to enumerate orders.
 */

const trackingLookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(6, 'Please enter your full order number')
    .max(40, 'Order number is too long'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter the 10-digit mobile number used for this order'),
});

export interface TrackingLookupResult {
  success: boolean;
  orderNumber?: string;
  trackToken?: string;
  error?: string;
}

const GENERIC_ERROR =
  'We could not find an order with that order number and phone number. Please check both and try again, or call the restaurant.';

function normalisePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

export async function findOrderForTracking(input: {
  orderNumber: string;
  phone: string;
}): Promise<TrackingLookupResult> {
  const parsed = trackingLookupSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid details' };
  }

  try {
    const supabase = createAdminClient();
    const orderNumber = parsed.data.orderNumber.replace(/^#/, '').trim().toUpperCase();

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_phone')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) {
      console.error('Tracking lookup failed:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }

    const isMatch =
      !!data && normalisePhone(data.customer_phone) === normalisePhone(parsed.data.phone);

    if (!isMatch) {
      return { success: false, error: GENERIC_ERROR };
    }

    return {
      success: true,
      orderNumber: data.order_number,
      trackToken: createTrackingToken(data.id),
    };
  } catch (e) {
    console.error('Unexpected tracking lookup error:', e);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
