import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Receipt, Sparkles, ShoppingBag } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/customer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatPaiseToRupees } from '@/lib/utils';
import { ReorderButton } from '@/components/ReorderButton';
import type { MenuItem, Order, OrderItem } from '@/types/database';

export const metadata: Metadata = {
  title: 'My orders | Josh Restaurant',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  ready: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

type OrderWithItems = Order & { order_items: OrderItem[] };

export default async function MyOrdersPage() {
  const user = await requireCustomer('/my-orders');

  const supabase = await createServerSupabaseClient();

  const { data: ordersData, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) console.error('Failed to load customer orders:', error);

  const orders = (ordersData ?? []) as OrderWithItems[];

  const menuItemIds = [
    ...new Set(orders.flatMap((o) => (o.order_items ?? []).map((i) => i.menu_item_id))),
  ].filter(Boolean) as string[];

  let menuById = new Map<string, MenuItem>();
  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .in('id', menuItemIds)
      .eq('is_active', true)
      .eq('is_sold_out', false);
    menuById = new Map(((menuItems ?? []) as MenuItem[]).map((item) => [item.id, item]));
  }

  const activeOrders = orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready');
  const pastOrders = orders.filter((o) => !activeOrders.includes(o));

  const renderCard = (order: OrderWithItems) => {
    const items = order.order_items ?? [];
    const reorderItems = items
      .map((item) => {
        const menuItem = item.menu_item_id ? menuById.get(item.menu_item_id) : undefined;
        return menuItem ? { item: menuItem, quantity: item.quantity } : null;
      })
      .filter((entry): entry is { item: MenuItem; quantity: number } => entry !== null);

    return (
      <div
        key={order.id}
        className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono font-black text-sm text-stone-900 dark:text-stone-100">
              #{order.order_number}
            </p>
            <p className="text-[11px] text-stone-400 flex flex-wrap items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {new Date(order.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata',
              })}
              <span className="mx-1">·</span>
              {order.order_type === 'delivery' ? (
                <>
                  <MapPin className="w-3 h-3" /> Delivery
                </>
              ) : (
                'Pickup'
              )}
            </p>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
              STATUS_STYLES[order.status] ?? ''
            }`}
          >
            {order.status}
          </span>
        </div>

        <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
          {items.slice(0, 4).map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>
                {item.quantity}× {item.item_name_snapshot}
              </span>
              <span>{formatPaiseToRupees(item.subtotal_paise)}</span>
            </li>
          ))}
          {items.length > 4 && (
            <li className="text-stone-400">+{items.length - 4} more item(s)</li>
          )}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800 pt-3 text-xs">
          <div className="space-y-0.5">
            {(order.discount_paise ?? 0) > 0 && (
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Saved {formatPaiseToRupees(order.discount_paise ?? 0)}
              </p>
            )}
            <p className="font-black text-sm text-stone-900 dark:text-stone-100">
              {formatPaiseToRupees(order.total_paise)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/account/orders/${order.order_number}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-bold hover:border-amber-500 transition"
            >
              <Receipt className="w-3 h-3" />
              <span>View status</span>
            </Link>
            <ReorderButton items={reorderItems} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <Link
          href="/account"
          className="text-xs font-bold text-stone-500 hover:text-amber-600"
        >
          My account →
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          My Orders
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {orders.length === 0
            ? 'No orders yet — your first order will appear here.'
            : `${orders.length} order${orders.length === 1 ? '' : 's'} · signed in as ${user.email ?? 'you'}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <ShoppingBag className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h2 className="font-bold text-stone-800 dark:text-stone-200">Nothing ordered yet</h2>
          <p className="text-xs text-stone-500 mt-1 mb-4">
            Browse the menu and your orders will be here, ready to reorder.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-md transition"
          >
            Browse the menu
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Active now
              </h2>
              {activeOrders.map(renderCard)}
            </section>
          )}

          {pastOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Past orders
              </h2>
              {pastOrders.map(renderCard)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
