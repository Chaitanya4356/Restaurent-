import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Store, ArrowLeft, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Tracking | Josh Restaurant',
  robots: { index: false, follow: false },
};

/**
 * Legacy / bookmarked order URL (no tracking token).
 *
 * Older links were `/order-confirmation/<order-number>` only. That URL is
 * intentionally no longer enough to see an order - it would let anyone who
 * guesses a short order number read a customer's name, phone and address.
 * Customers are sent to the secure lookup instead.
 */
export default function OrderConfirmationVerifyPage() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-400">
        <Store className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
        One quick check to see your order
      </h1>
      <p className="text-sm text-stone-500">
        Your order details are private, so this link needs a quick verification. Enter your
        order number and the mobile number you used at checkout.
      </p>
      <Link
        href="/track"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm shadow-md transition"
      >
        <Search className="w-4 h-4" />
        <span>Track My Order</span>
      </Link>
      <div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Menu</span>
        </Link>
      </div>
    </div>
  );
}
