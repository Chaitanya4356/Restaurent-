'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Clock } from 'lucide-react';

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim().toUpperCase().replace('#', '');
    if (clean) {
      router.push(`/order-confirmation/${clean}`);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 sm:py-20 space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
        <Clock className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Track Your Live Order
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Enter your order number from your confirmation screen to view real-time cooking & dispatch progress.
        </p>
      </div>

      <form onSubmit={handleTrack} className="space-y-3 text-left">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            placeholder="e.g. JOSH-20261020-4921"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2"
        >
          <span>Track Order</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
