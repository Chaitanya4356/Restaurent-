import React from 'react';
import Link from 'next/link';
import { OpenStatusBadge } from '@/components/OpenStatusBadge';
import { DishImage } from '@/components/DishImage';
import {
  UtensilsCrossed,
  Bike,
  Sparkles,
  Phone,
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { createPublicServerClient } from '@/lib/supabase/public';
import { getPublicSettings } from '@/lib/settings';
import type { MenuItem } from '@/types/database';
import { formatPaiseToRupees, formatTimeTo12h, minusMinutesFromTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await getPublicSettings();
  const openingLabel = formatTimeTo12h(settings.opening_time);
  const closingLabel = formatTimeTo12h(settings.closing_time);
  const cutoffLabel = formatTimeTo12h(
    minusMinutesFromTime(settings.closing_time, settings.order_cutoff_minutes)
  );
  // Fetch a representative spread of featured dishes from Supabase
  let featuredDishes: MenuItem[] = [];
  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (data) {
      // Show a spread across categories (one per category, then a second
      // round) instead of whichever four rows the database happens to return.
      const byCategory = new Map<string, MenuItem[]>();
      for (const item of data as MenuItem[]) {
        const list = byCategory.get(item.category_id) ?? [];
        list.push(item);
        byCategory.set(item.category_id, list);
      }

      const spread: MenuItem[] = [];
      for (let round = 0; round < 2 && spread.length < 4; round += 1) {
        for (const list of byCategory.values()) {
          const candidate = list[round];
          if (candidate && spread.length < 4) spread.push(candidate);
        }
      }

      featuredDishes = spread;
    }
  } catch (e) {
    console.error('Failed to fetch featured dishes:', e);
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-brand-dark text-white p-6 sm:p-10 lg:p-14 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-6">
          {/* Live Open / Closed Badge */}
          <div>
            <OpenStatusBadge className="bg-white/20 text-white border-white/30 backdrop-blur-md" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Crispy Tiffins & Fragrant Dum Biryanis
            </h1>
            <p className="text-base sm:text-lg text-amber-100 font-medium leading-relaxed">
              Experience the genuine coastal spices and authentic South Indian culinary tradition of Visakhapatnam, made fresh to order.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-stone-900 hover:bg-amber-50 active:scale-95 font-bold text-sm shadow-lg shadow-black/10 transition"
            >
              <span>Order Online Now</span>
              <ArrowRight className="w-4 h-4 text-amber-600" />
            </Link>

            <a
              href={`tel:${settings.phone_number.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 active:scale-95 text-white font-semibold text-sm backdrop-blur-xs transition"
            >
              <Phone className="w-4 h-4" />
              <span>Call: {settings.phone_number}</span>
            </a>
          </div>

          {/* Quick Perks Strip */}
          <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-amber-100">
            <span className="flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-amber-200" /> 20 km Vizag Delivery
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-200" /> Free delivery above ₹500
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-200" /> Pure Desi Ghee
            </span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 opacity-15 hidden lg:block pointer-events-none">
          <UtensilsCrossed className="w-72 h-72 text-white" />
        </div>
      </section>

      {/* Highlights Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Fast 20 km Vizag Delivery
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Piping hot food delivered straight to your doorstep across Visakhapatnam. ₹40 flat fee, free on orders above ₹500.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Fresh Daily & Pure Ghee
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              No preservatives or artificial coloring. Batter naturally fermented daily; authentic dum cooking with genuine ghee.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
              Open {openingLabel} – {closingLabel}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Morning breakfast, afternoon biryanis, and late-night cravings. Kitchen accepts orders until {cutoffLabel} every night.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Menu Dishes Preview */}
      {featuredDishes.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">
                Customer Favorites
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
                Popular Dishes
              </h2>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
            >
              <span>See Full Menu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredDishes.map((dish) => (
              <div
                key={dish.id}
                className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition shadow-xs flex flex-col justify-between"
              >
                <div>
                  <DishImage
                    src={dish.image_url}
                    alt={dish.name}
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                    className="w-full aspect-[4/3] rounded-xl mb-3"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[9px] font-bold ${
                        dish.dietary_type === 'veg'
                          ? 'border-emerald-600 text-emerald-600'
                          : 'border-rose-600 text-rose-600'
                      }`}
                      title={dish.dietary_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      ●
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      Popular
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    {dish.name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                    {dish.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                    {formatPaiseToRupees(dish.price_paise)}
                  </span>
                  <Link
                    href="/menu"
                    className="text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    + Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Location & Hours Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-stone-900 text-white space-y-6">
        <div className="max-w-xl space-y-2">
          <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
            Visit Our Counter
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {settings.restaurant_name} Restaurant, {settings.city}
          </h2>
          <p className="text-sm text-stone-400">
            Conveniently located near Beach Road, Siripuram. Dine-in, pickup counter, and fast 20 km city delivery available.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-stone-200 text-sm">Restaurant Address</p>
              <p className="text-stone-400">
                {settings.address}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-stone-200 text-sm">Service Hours</p>
              <p className="text-stone-400">
                Daily: {openingLabel} – {closingLabel} IST (Orders cutoff at {cutoffLabel})
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
