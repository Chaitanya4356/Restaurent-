import React from 'react';
import type { Metadata } from 'next';
import { Phone, MapPin, Clock, Bike, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { getPublicSettings } from '@/lib/settings';
import { formatPaiseToRupees, formatTimeTo12h, minusMinutesFromTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Contact & Location | Josh Restaurant Vizag',
  description:
    'Get in touch with Josh Restaurant in Visakhapatnam. View counter location, phone number, operating hours, and delivery area details.',
};

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const phoneDigits = settings.phone_number.replace(/\D/g, '');
  const openingLabel = formatTimeTo12h(settings.opening_time);
  const closingLabel = formatTimeTo12h(settings.closing_time);
  const cutoffLabel = formatTimeTo12h(
    minusMinutesFromTime(settings.closing_time, settings.order_cutoff_minutes)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">
          We are here to help
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Contact Josh Restaurant
        </h1>
        <p className="text-sm text-stone-500 max-w-lg mx-auto">
          Have a question about your order, special catering request, or delivery address? Reach out to our kitchen counter anytime.
        </p>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Direct Call & WhatsApp */}
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Kitchen Counter Phone
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Call us directly for instant order queries or pickup coordination.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <a
              href={`tel:${settings.phone_number.replace(/\s+/g, '')}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs shadow-md transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{settings.phone_number}</span>
            </a>

            <a
              href={`https://wa.me/${phoneDigits}?text=Hello%20${encodeURIComponent(settings.restaurant_name)}%20Restaurant,%20I%20have%20an%20order%20query`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Us</span>
            </a>
          </div>
        </div>

        {/* Counter Location */}
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Restaurant Location
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {settings.address}
            </p>
          </div>
          <div className="pt-2">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 hover:underline"
            >
              <span>Open in Google Maps →</span>
            </a>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Operating Hours
              </h3>
              <p className="text-xs text-stone-500">Asia/Kolkata (IST)</p>
            </div>
          </div>
          <div className="text-xs space-y-1 text-stone-600 dark:text-stone-300 pt-1">
            <p className="flex justify-between">
              <span>Monday – Sunday:</span>
              <strong className="text-stone-900 dark:text-stone-100">{openingLabel} – {closingLabel}</strong>
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              * Online order cutoff at {cutoffLabel} nightly.
            </p>
          </div>
        </div>

        {/* Delivery Limits */}
        <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Delivery Coverage
              </h3>
              <p className="text-xs text-stone-500">Within {settings.delivery_radius_km ?? 20} km radius in {settings.city}</p>
            </div>
          </div>
          <div className="text-xs space-y-1 text-stone-600 dark:text-stone-300 pt-1">
            <p className="flex justify-between">
              <span>Delivery Fee:</span>
              <strong>
                {formatPaiseToRupees(settings.delivery_fee_paise)} flat (FREE &gt;{' '}
                {formatPaiseToRupees(settings.free_delivery_threshold_paise)})
              </strong>
            </p>
            <p className="flex justify-between">
              <span>Minimum Delivery Order:</span>
              <strong>{formatPaiseToRupees(settings.min_delivery_order_paise)}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
