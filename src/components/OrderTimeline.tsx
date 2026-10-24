'use client';

import React from 'react';
import { Check, ChefHat, PackageCheck, Bike, XCircle, Clock } from 'lucide-react';
import { formatIstDateTime } from '@/lib/datetime';
import type { OrderStatus } from '@/types/database';

export interface OrderStatusEvent {
  status: OrderStatus;
  created_at: string;
  note?: string | null;
}

interface OrderTimelineProps {
  status: OrderStatus;
  events: OrderStatusEvent[];
  orderType: 'pickup' | 'delivery';
  estimatedMinutes?: number | null;
  createdAt?: string;
}

const STEPS: Array<{
  status: OrderStatus;
  label: string;
  deliveryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { status: 'new', label: 'Order received', deliveryLabel: 'Order received', icon: Check },
  { status: 'preparing', label: 'Cooking', deliveryLabel: 'Cooking', icon: ChefHat },
  { status: 'ready', label: 'Ready for pickup', deliveryLabel: 'Out for delivery', icon: Bike },
  { status: 'completed', label: 'Completed', deliveryLabel: 'Delivered', icon: PackageCheck },
];

/**
 * Amazon-style vertical timeline: each completed step shows when it happened.
 * Future steps are shown greyed so the customer can see what comes next.
 */
export function OrderTimeline({
  status,
  events,
  orderType,
  estimatedMinutes,
  createdAt,
}: OrderTimelineProps) {
  const byStatus = new Map<string, OrderStatusEvent>();
  for (const event of events ?? []) {
    // keep the earliest event per status
    if (!byStatus.has(event.status)) byStatus.set(event.status, event);
  }

  // Fallbacks so an order with no events still renders sensibly
  if (!byStatus.has('new') && createdAt) {
    byStatus.set('new', { status: 'new', created_at: createdAt });
  }

  const cancelled = status === 'cancelled';
  const cancelledEvent = byStatus.get('cancelled');
  const currentIndex = STEPS.findIndex((step) => step.status === status);
  const lastCompletedIndex = cancelled
    ? Math.max(0, ...STEPS.map((s, i) => (byStatus.has(s.status) ? i : -1)))
    : currentIndex;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {cancelled ? (
            <p className="text-lg font-black text-rose-700 dark:text-rose-400">Order cancelled</p>
          ) : status === 'completed' ? (
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {orderType === 'delivery' ? 'Delivered' : 'Picked up'}
              {byStatus.get('completed') ? (
                <span className="block text-[11px] font-semibold text-stone-500">
                  {formatIstDateTime(byStatus.get('completed')!.created_at)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-lg font-black text-stone-900 dark:text-stone-100">
              {estimatedMinutes
                ? `Arriving in about ${estimatedMinutes} min`
                : orderType === 'delivery'
                ? 'Preparing your delivery'
                : 'Preparing your pickup'}
            </p>
          )}
          <p className="text-[11px] text-stone-500 mt-0.5">
            {byStatus.get('new')
              ? `Ordered ${formatIstDateTime(byStatus.get('new')!.created_at)}`
              : 'Order placed'}
          </p>
        </div>

        {estimatedMinutes && !cancelled && status !== 'completed' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5" />
            ~{estimatedMinutes} min
          </span>
        ) : null}
      </div>

      {/* Steps */}
      <ol className="relative space-y-1">
        {STEPS.map((step, index) => {
          const event = byStatus.get(step.status);
          const isDone = Boolean(event) || (!cancelled && index < lastCompletedIndex);
          const isCurrent = !cancelled && index === currentIndex && !event;
          const Icon = step.icon;
          const isLast = index === STEPS.length - 1;

          // Hide steps that come after a cancellation
          if (cancelled && index > lastCompletedIndex && index !== 0) return null;

          return (
            <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Connector */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${
                    isDone ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'
                  }`}
                />
              )}

              {/* Node */}
              <span
                className={`relative z-10 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-white dark:bg-stone-900 border-amber-500 text-amber-600'
                    : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-300 dark:text-stone-600'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={`text-sm font-bold ${
                    isDone
                      ? 'text-stone-900 dark:text-stone-100'
                      : isCurrent
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {orderType === 'delivery' ? step.deliveryLabel : step.label}
                </p>
                {event ? (
                  <p className="text-[11px] text-stone-500">
                    {formatIstDateTime(event.created_at)}
                    {event.note ? ` · ${event.note}` : ''}
                  </p>
                ) : isCurrent ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                    In progress…
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}

        {/* Cancelled marker */}
        {cancelled && (
          <li className="relative flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-950 text-rose-600">
              <XCircle className="w-4 h-4" />
            </span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Order cancelled</p>
              <p className="text-[11px] text-stone-500">
                {cancelledEvent
                  ? formatIstDateTime(cancelledEvent.created_at)
                  : 'Please call the restaurant for details.'}
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
