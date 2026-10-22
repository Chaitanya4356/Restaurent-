import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Josh Restaurant',
  description: 'Understand how Josh Restaurant collects, processes, and protects your personal information.',
};

export default function PrivacyPage() {
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
          <ShieldCheck className="w-4 h-4" />
          <span>Customer Data & Privacy</span>
        </div>
        <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-stone-500">Last updated: October 2026</p>
      </div>

      <div className="prose dark:prose-invert prose-stone max-w-none text-sm space-y-6 text-stone-700 dark:text-stone-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">1. Information We Collect</h2>
          <p>
            When you place an order on our website without creating an account, we collect only the essential information needed to fulfill and deliver your food:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contact details:</strong> Your full name and 10-digit Indian mobile number for order status updates and delivery coordination.</li>
            <li><strong>Delivery location:</strong> Your doorstep address (flat/house number, street, landmark, Visakhapatnam area) if you select home delivery.</li>
            <li><strong>Order details:</strong> The dishes selected, quantities, and special cooking instructions.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">2. How We Use Your Information</h2>
          <p>Your information is used strictly for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Preparing your ordered items in our kitchen counter.</li>
            <li>Coordinating delivery handoff within our 20 km Vizag radius.</li>
            <li>Sending email alerts to restaurant staff to begin cooking immediately.</li>
          </ul>
          <p className="font-semibold text-stone-900 dark:text-stone-100">
            We never sell, rent, or trade your personal data to marketing third parties or advertisers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">3. Data Security & Storage</h2>
          <p>
            All order information is stored in encrypted PostgreSQL databases powered by Supabase with strict Row Level Security (RLS) policies. Only authenticated restaurant management can access historical order books.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">4. Contact Us</h2>
          <p>
            If you have questions regarding your data or wish to request data deletion, contact us at:
            <br />
            <strong>Josh Restaurant</strong>, Beach Road, Siripuram, Visakhapatnam, AP 530003
            <br />
            Email: <a href="mailto:bchaitanya096@gmail.com" className="text-amber-600 hover:underline">bchaitanya096@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
