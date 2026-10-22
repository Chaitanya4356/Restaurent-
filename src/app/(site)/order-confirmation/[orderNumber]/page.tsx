import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrderLiveTracker } from '@/components/OrderLiveTracker';
import type { Order, OrderItem } from '@/types/database';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Status & Tracking | Josh Restaurant',
  description: 'Track the live preparation and dispatch status of your order at Josh Restaurant.',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const adminSupabase = createAdminClient();

  // Fetch Order
  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (orderError || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-400">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Order Not Found
        </h1>
        <p className="text-sm text-stone-500">
          We could not find an order matching <span className="font-mono font-bold">#{orderNumber}</span>. Please verify your order number or check back later.
        </p>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Menu</span>
        </Link>
      </div>
    );
  }

  // Fetch Order Items Snapshot
  const { data: items } = await adminSupabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  // Fetch Restaurant Phone
  const { data: settings } = await adminSupabase
    .from('restaurant_settings')
    .select('phone_number')
    .eq('id', 1)
    .single();

  return (
    <OrderLiveTracker
      initialOrder={order as Order}
      orderItems={(items || []) as OrderItem[]}
      phone={settings?.phone_number || '+91 98765 43210'}
    />
  );
}
