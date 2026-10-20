'use client';

import React, { useEffect, useState } from 'react';
import { calculateStoreStatus, type StoreStatus } from '@/lib/opening-hours';
import { Clock } from 'lucide-react';

interface OpenStatusBadgeProps {
  isAcceptingOrders?: boolean;
  openingTime?: string;
  closingTime?: string;
  orderCutoffMinutes?: number;
  className?: string;
}

export function OpenStatusBadge({
  isAcceptingOrders = true,
  openingTime = '07:00:00',
  closingTime = '23:00:00',
  orderCutoffMinutes = 20,
  className = '',
}: OpenStatusBadgeProps) {
  const [status, setStatus] = useState<StoreStatus | null>(null);

  useEffect(() => {
    // Evaluate store status on client mount (safe from SSR prerender constraints)
    setStatus(
      calculateStoreStatus(isAcceptingOrders, openingTime, closingTime, orderCutoffMinutes, new Date())
    );

    const interval = setInterval(() => {
      setStatus(
        calculateStoreStatus(isAcceptingOrders, openingTime, closingTime, orderCutoffMinutes, new Date())
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [isAcceptingOrders, openingTime, closingTime, orderCutoffMinutes]);

  const badgeStyles = {
    open: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    'closing-soon': 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    closed: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  };

  const dotStyles = {
    open: 'bg-emerald-500 animate-pulse',
    'closing-soon': 'bg-amber-500 animate-pulse',
    closed: 'bg-rose-500',
  };

  if (!status) {
    // Initial static placeholder before client hydration
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-stone-400" />
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Checking store hours...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border shadow-xs ${badgeStyles[status.badgeVariant]} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotStyles[status.badgeVariant]}`} />
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{status.statusText}</span>
    </div>
  );
}
