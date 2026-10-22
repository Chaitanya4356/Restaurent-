import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCcw, ArrowLeft } from 'lucide-react';
import { getPublicSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | Josh Restaurant',
  description: 'Understand the cancellation window and refund procedures for orders at Josh Restaurant.',
};

export default async function RefundPage() {
  const settings = await getPublicSettings();

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-amber-600 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Home</span>
      </Link>

      <div className="space-y-2 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
          <RefreshCcw className="w-4 h-4" />
          <span>Customer Protection</span>
        </div>
        <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Cancellation & Refund Policy
        </h1>
        <p className="text-xs text-stone-500">Effective as of October 2026</p>
      </div>

      <div className="prose dark:prose-invert prose-stone max-w-none text-sm space-y-6 text-stone-700 dark:text-stone-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">1. Order Cancellations</h2>
          <p>
            Because our tiffins and biryanis are prepared fresh to order with hot ghee and freshly ground spices, our cancellation window is limited:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Before Kitchen Cooking Begins:</strong> You may cancel your order free of charge while the order status is still marked as <em>&quot;New Order&quot;</em> by immediately calling our counter at <strong>{settings.phone_number}</strong>.</li>
            <li><strong>Once Cooking Commences:</strong> Once our chefs have started cooking your meal (status marked as <em>&quot;Cooking in Kitchen&quot;</em>), orders cannot be cancelled or refunded as food preparation has already begun.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">2. Quality Issues & Missing Items</h2>
          <p>
            If any item delivered to you is incorrect, missing, or compromised in quality:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Please contact us within <strong>30 minutes</strong> of delivery at {settings.phone_number} or via WhatsApp with your Order Number and a photograph of the issue.</li>
            <li>We will promptly dispatch a replacement hot item or issue a full refund for the affected dish.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">3. Refund Processing Timeline</h2>
          <p>
            For prepaid or online transactions, approved refunds are initiated within <strong>24 business hours</strong> and credited back to the original payment source (UPI account or bank card) within 3–5 business days, depending on your bank.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">4. Support Contact</h2>
          <p>
            For any billing or cancellation questions, please call our counter directly at <strong>{settings.phone_number}</strong> or email <a href="mailto:bchaitanya096@gmail.com" className="text-amber-600 hover:underline">bchaitanya096@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
