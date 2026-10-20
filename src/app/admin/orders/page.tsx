import React from 'react';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminOrdersManager, type OrderWithItems } from '@/components/AdminOrdersManager';
import type { Order, OrderItem } from '@/types/database';

export const metadata: Metadata = {
  title: 'Kitchen Orders Dashboard | Josh Restaurant',
  description: 'Live kitchen orders dashboard with real-time status management.',
};

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();

  // Fetch all recent orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !orders) {
    console.error('Failed to load orders for admin:', error);
  }

  // Fetch items snapshots for active orders
  const orderIds = (orders || []).map((o) => o.id);
  let orderItems: OrderItem[] = [];

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);
    if (items) orderItems = items as OrderItem[];
  }

  const itemsByOrderId = new Map<string, OrderItem[]>();
  orderItems.forEach((it) => {
    const existing = itemsByOrderId.get(it.order_id) || [];
    existing.push(it);
    itemsByOrderId.set(it.order_id, existing);
  });

  const ordersWithItems: OrderWithItems[] = (orders || []).map((o) => ({
    ...(o as Order),
    items: itemsByOrderId.get(o.id) || [],
  }));

  return <AdminOrdersManager initialOrders={ordersWithItems} />;
}
