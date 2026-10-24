import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Receipt, Sparkles, Bike, Store } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/customer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatPaiseToRupees } from '@/lib/utils';
import { OrderTimeline, type OrderStatusEvent } from '@/components/OrderTimeline';
import { ReorderButton } from '@/components/ReorderButton';
import type { MenuItem, Order, OrderItem, OrderStatus } from '@/types/database';

export const metadata: Metadata = {
  title: 'Order status | Josh Restaurant',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

type OrderWithItems = Order & { order_items: OrderItem[] };

export default async function AccountOrderPage({ params }: PageProps) {
  const { orderNumber } = await params;
  await requireCustomer(`/account/orders/${orderNumber}`);

  // Cookie-scoped client: RLS only returns orders belonging to this customer.
  const supabase = await createServerSupabaseClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_number', decodeURIComponent(orderNumber))
    .maybeSingle();

  if (error || !order) notFound();

  const typedOrder = order as OrderWithItems;

  const { data: eventsData } = await supabase
    .from('order_status_events')
    .select('status, created_at, note')
    .eq('order_id', typedOrder.id)
    .order('created_at', { ascending: true });

  const events = (eventsData ?? []) as OrderStatusEvent[];

  // Live menu items so "Order again" uses current prices/availability
  const menuItemIds = (typedOrder.order_items ?? [])
    .map((item) => item.menu_item_id)
    .filter(Boolean) as string[];

  let reorderItems: Array<{ item: MenuItem; quantity: number }> = [];
  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .in('id', menuItemIds)
      .eq('is_active', true)
      .eq('is_sold_out', false);

    const byId = new Map(((menuItems ?? []) as MenuItem[]).map((item) => [item.id, item]));
    reorderItems = (typedOrder.order_items ?? [])
      .map((item) => {
        const menuItem = item.menu_item_id ? byId.get(item.menu_item_id) : undefined;
        return menuItem ? { item: menuItem, quantity: item.quantity } : null;
      })
      .filter((entry): entry is { item: MenuItem; quantity: number } => entry !== null);
  }

  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('phone_number')
    .eq('id', 1)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All my orders</span>
        </Link>
        <span className="font-mono text-xs font-bold text-stone-500">
          #{typedOrder.order_number}
        </span>
      </div>

      {/* Timeline card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <OrderTimeline
          status={typedOrder.status as OrderStatus}
          events={events}
          orderType={typedOrder.order_type}
          estimatedMinutes={typedOrder.estimated_delivery_minutes ?? null}
          createdAt={typedOrder.created_at}
        />
      </div>

      {/* Items + totals */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            Your items
          </h2>
          <ReorderButton items={reorderItems} />
        </div>

        <ul className="space-y-2 text-xs divide-y divide-stone-100 dark:divide-stone-800">
          {(typedOrder.order_items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-2 pt-2 first:pt-0">
              <span>
                <strong>{item.quantity}×</strong> {item.item_name_snapshot}
                {item.item_notes ? (
                  <span className="block text-[10px] italic text-amber-700 dark:text-amber-400">
                    {item.item_notes}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold">{formatPaiseToRupees(item.subtotal_paise)}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-1 text-xs">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>{formatPaiseToRupees(typedOrder.subtotal_paise)}</span>
          </div>
          {(typedOrder.discount_paise ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Discount{typedOrder.promotion_code ? ` (${typedOrder.promotion_code})` : ''}
              </span>
              <span>−{formatPaiseToRupees(typedOrder.discount_paise ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-500">
            <span>{typedOrder.order_type === 'delivery' ? 'Delivery fee' : 'Pickup'}</span>
            <span>
              {typedOrder.delivery_fee_paise === 0
                ? 'FREE'
                : formatPaiseToRupees(typedOrder.delivery_fee_paise)}
            </span>
          </div>
          <div className="flex justify-between text-base font-black text-stone-900 dark:text-stone-100 pt-1">
            <span>Total</span>
            <span className="text-amber-600">{formatPaiseToRupees(typedOrder.total_paise)}</span>
          </div>
        </div>
      </div>

      {/* Fulfilment + payment */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {typedOrder.order_type === 'delivery' ? 'Delivery to' : 'Pickup'}
          </span>
          <p className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            {typedOrder.order_type === 'delivery' ? (
              <>
                <Bike className="w-4 h-4 text-amber-600" />
                <span>Doorstep delivery</span>
              </>
            ) : (
              <>
                <Store className="w-4 h-4 text-amber-600" />
                <span>Counter pickup</span>
              </>
            )}
          </p>
          {typedOrder.delivery_address ? (
            <p className="text-stone-500 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{typedOrder.delivery_address}</span>
            </p>
          ) : null}
          {typedOrder.delivery_pincode ? (
            <p className="text-stone-500">Pincode {typedOrder.delivery_pincode}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Payment
          </span>
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {typedOrder.payment_method === 'upi_on_delivery' ? 'UPI on handoff' : 'Cash on handoff'}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold uppercase">
            {typedOrder.payment_status}
          </p>
          <a
            href={`tel:${(settings?.phone_number ?? '').replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 pt-1 text-stone-600 dark:text-stone-300 hover:text-amber-600 font-semibold"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{settings?.phone_number ?? 'Call us'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
