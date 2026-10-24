import React from 'react';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTrackingToken } from '@/lib/tracking';
import { OrderLiveTracker } from '@/components/OrderLiveTracker';
import type { Order, OrderItem } from '@/types/database';
import Link from 'next/link';
import { ArrowLeft, Store, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Status & Tracking | Josh Restaurant',
  description: 'Track the live preparation and dispatch status of your order at Josh Restaurant.',
  // A customer's receipt must never be indexed by search engines.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderNumber: string; token: string }>;
}

/**
 * Signed live-tracking page.
 *
 * The URL contains the order number AND an HMAC token derived from the order's
 * UUID. Without the token (which only the customer receives at checkout, or
 * after verifying their phone number on /track) no order data is rendered -
 * order numbers alone are short and guessable.
 */
export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber, token } = await params;
  const adminSupabase = createAdminClient();

  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .maybeSingle();

  // Invalid order OR invalid/forged token -> identical response.
  if (orderError || !order || !verifyTrackingToken(order.id, token)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          This tracking link is not valid
        </h1>
        <p className="text-sm text-stone-500">
          For your privacy, order tracking requires the exact link you received after
          checkout. You can look your order up again with your order number and the phone
          number used to place it.
        </p>
        <Link
          href="/track"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Find My Order</span>
        </Link>
      </div>
    );
  }

  // Fetch Order Items Snapshot
  const { data: items } = await adminSupabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  // Fetch the status history for the timeline
  const { data: eventRows } = await adminSupabase
    .from('order_status_events')
    .select('status, created_at, note')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  // Fetch restaurant + payment settings (select '*' so the page keeps working
  // before the UPI columns migration has been applied).
  const { data: settings } = await adminSupabase
    .from('restaurant_settings')
    .select('*')
    .eq('id', 1)
    .single();

  return (
    <OrderLiveTracker
      initialOrder={order as Order}
      orderItems={(items || []) as OrderItem[]}
      phone={settings?.phone_number || '+91 98765 43210'}
      trackToken={token}
      deliveryRadiusKm={settings?.delivery_radius_km ?? 20}
      initialEvents={(eventRows ?? []) as Array<{
        status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
        created_at: string;
        note: string | null;
      }>}
      upi={{
        id: settings?.upi_id ?? null,
        phone: settings?.upi_phone ?? null,
        qrUrl: settings?.upi_qr_url ?? null,
        payeeName: settings?.upi_payee_name ?? null,
      }}
    />
  );
}
