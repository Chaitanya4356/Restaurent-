'use client';

import React, { useEffect, useState } from 'react';
import type { Order, OrderItem, OrderStatus } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { formatPaiseToRupees } from '@/lib/utils';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  Phone,
  ArrowLeft,
  Receipt,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface OrderLiveTrackerProps {
  initialOrder: Order;
  orderItems: OrderItem[];
  phone?: string;
}

const STATUS_STEPS: Array<{
  status: OrderStatus;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    status: 'new',
    label: 'Order Placed',
    desc: 'Sent to Josh kitchen counter',
    icon: CheckCircle2,
  },
  {
    status: 'preparing',
    label: 'Cooking in Kitchen',
    desc: 'Freshly prepared with pure ghee',
    icon: ChefHat,
  },
  {
    status: 'ready',
    label: 'Ready / Dispatched',
    desc: 'Packed hot and ready for handoff',
    icon: Bike,
  },
  {
    status: 'completed',
    label: 'Completed',
    desc: 'Order handed over successfully',
    icon: PackageCheck,
  },
];

export function OrderLiveTracker({
  initialOrder,
  orderItems,
  phone = '+91 98765 43210',
}: OrderLiveTrackerProps) {
  const [order, setOrder] = useState<Order>(initialOrder);

  // Subscribe to real-time status updates on this specific order
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (e) {
      console.warn('Realtime client not available:', e);
      return;
    }

    const channel = supabase
      .channel(`order-status-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new) {
            setOrder(payload.new as Order);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [order.id]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Top Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Order Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Thank you, <span className="font-bold text-stone-900 dark:text-stone-100">{order.customer_name}</span>. Your order is received by the kitchen.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-mono font-bold mt-2">
          <span>Order #{order.order_number}</span>
        </div>
      </div>

      {/* Real-time Order Status Stepper */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Live Kitchen Tracker
            </h2>
          </div>
          <span className="text-xs font-medium text-stone-400">
            Updates in real-time
          </span>
        </div>

        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-800 dark:text-rose-200 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Order Cancelled</p>
              <p className="text-xs">
                This order was cancelled by staff. Please contact the counter at {phone} for details.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPast = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div
                  key={step.status}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 ${
                    isCurrent
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/20'
                      : isPast
                      ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-stone-700 dark:text-stone-300'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 text-stone-400'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCurrent
                        ? 'bg-amber-600 text-white animate-bounce'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${isCurrent ? 'text-amber-900 dark:text-amber-200' : ''}`}>
                      {step.label}
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Estimated Timing:</span>
          </div>
          <span className="font-bold text-stone-900 dark:text-stone-100">
            {order.preferred_time === 'ASAP' ? '25 – 40 minutes' : order.preferred_time}
          </span>
        </div>
      </div>

      {/* Itemized Order Snapshot Receipt */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <Receipt className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
            Order Receipt & Snapshot
          </h2>
        </div>

        {/* Items Table */}
        <div className="space-y-3 divide-y divide-stone-100 dark:divide-stone-800">
          {orderItems.map((item) => (
            <div key={item.id} className="pt-2.5 first:pt-0 flex items-start justify-between text-xs gap-3">
              <div className="flex-1">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {item.quantity}x {item.item_name_snapshot}
                </span>
                <span className="text-stone-400 text-[11px] block">
                  {formatPaiseToRupees(item.item_price_paise)} each
                </span>
                {item.item_notes && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 italic mt-0.5">
                    Note: {item.item_notes}
                  </p>
                )}
              </div>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {formatPaiseToRupees(item.subtotal_paise)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>{formatPaiseToRupees(order.subtotal_paise)}</span>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>
              {order.order_type === 'delivery' ? 'Delivery Fee (Vizag 20 km)' : 'Counter Pickup'}
            </span>
            <span>
              {order.delivery_fee_paise === 0 ? (
                <span className="text-emerald-600 font-bold">FREE</span>
              ) : (
                formatPaiseToRupees(order.delivery_fee_paise)
              )}
            </span>
          </div>
          <div className="border-t border-stone-200 dark:border-stone-800 pt-2 flex justify-between text-base font-black text-stone-900 dark:text-stone-100">
            <span>Total to Pay</span>
            <span className="text-amber-600">{formatPaiseToRupees(order.total_paise)}</span>
          </div>
        </div>

        {/* Fulfillment & Payment Details */}
        <div className="border-t border-stone-100 dark:border-stone-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider">
              Fulfillment Type
            </span>
            <p className="font-semibold text-stone-800 dark:text-stone-200 capitalize flex items-center gap-1.5">
              {order.order_type === 'delivery' ? (
                <>
                  <Bike className="w-4 h-4 text-amber-600" />
                  <span>Doorstep Delivery (Vizag)</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Counter Pickup (Siripuram)</span>
                </>
              )}
            </p>
            {order.delivery_address && (
              <p className="text-stone-500 pt-1 leading-relaxed">
                {order.delivery_address}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider">
              Payment Method
            </span>
            <p className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
              {order.payment_method === 'upi_on_delivery'
                ? 'UPI QR Code Scan on Handoff'
                : 'Cash on Handoff'}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Payment status: <span className="font-bold uppercase">{order.payment_status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Help & Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-amber-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Menu</span>
        </Link>

        <a
          href={`tel:${phone.replace(/\s+/g, '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-xs font-bold text-stone-800 dark:text-stone-200 transition"
        >
          <Phone className="w-3.5 h-3.5 text-amber-600" />
          <span>Questions? Call Counter: {phone}</span>
        </a>
      </div>
    </div>
  );
}
