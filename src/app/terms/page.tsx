import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Josh Restaurant',
  description: 'Review the ordering, delivery, and payment terms for Josh Restaurant in Visakhapatnam.',
};

export default function TermsPage() {
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
          <FileText className="w-4 h-4" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-stone-500">Effective as of October 2026</p>
      </div>

      <div className="prose dark:prose-invert prose-stone max-w-none text-sm space-y-6 text-stone-700 dark:text-stone-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">1. Ordering & Acceptance</h2>
          <p>
            By placing an order via our online portal, you agree that you are offering to purchase selected food items subject to acceptance by Josh Restaurant kitchen staff. An order confirmation screen with a unique order number indicates receipt of your request.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">2. Operating Hours & Order Cutoff</h2>
          <p>
            Our kitchen operates daily from <strong>07:00 AM to 11:00 PM IST</strong>. To ensure food quality and kitchen closing routines, new online orders cut off strictly <strong>20 minutes prior to closing (10:40 PM IST)</strong>. Orders placed outside operating hours cannot be fulfilled.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">3. Delivery Area & Charges</h2>
          <p>
            We provide doorstep food delivery within a <strong>20 km radius</strong> of our Siripuram, Visakhapatnam counter:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Minimum delivery order:</strong> ₹100. Orders below this threshold must be picked up at the counter.</li>
            <li><strong>Delivery fee:</strong> Flat ₹40 per delivery order.</li>
            <li><strong>Free delivery:</strong> Applicable automatically on all orders with a subtotal of ₹500 or higher.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">4. Pricing Integrity & Currency</h2>
          <p>
            All prices are quoted in Indian Rupees (INR) and are recalculated directly from our official database. We reserve the right to correct any typographical inaccuracies prior to kitchen confirmation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">5. Payment Methods</h2>
          <p>
            Payments may be completed at the time of delivery handoff or counter pickup via Cash or UPI QR scan (Google Pay, PhonePe, Paytm). Online payment via Razorpay will be introduced in future updates.
          </p>
        </section>
      </div>
    </div>
  );
}
