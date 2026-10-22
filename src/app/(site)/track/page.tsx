'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Clock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { findOrderForTracking } from '@/app/actions/track-order';

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await findOrderForTracking({ orderNumber, phone });

      if (!result.success || !result.orderNumber || !result.trackToken) {
        setErrorMessage(result.error || 'We could not find that order. Please check your details.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/order-confirmation/${result.orderNumber}/${result.trackToken}`);
    } catch (e) {
      console.error('Tracking lookup failed:', e);
      setErrorMessage('Something went wrong. Please try again.');
      setIsSubmitting(false);
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
          Enter your order number and the mobile number you used at checkout to view real-time
          cooking &amp; dispatch progress.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 text-left"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleTrack} className="space-y-3 text-left">
        <div className="space-y-1">
          <label htmlFor="orderNumber" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            Order Number
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="orderNumber"
              type="text"
              required
              placeholder="e.g. JOSH-20261020-4921"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="trackPhone" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            Mobile Number Used at Checkout
          </label>
          <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 shadow-xs">
            <span className="px-3.5 py-3 text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 flex items-center">
              +91
            </span>
            <input
              id="trackPhone"
              type="tel"
              inputMode="numeric"
              required
              maxLength={10}
              autoComplete="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full px-3.5 py-3 bg-transparent text-sm focus:outline-hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-brand/20 transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Looking up your order...</span>
            </>
          ) : (
            <>
              <span>Track Order</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>We ask for your phone number so only you can view your order.</span>
      </p>
    </div>
  );
}
