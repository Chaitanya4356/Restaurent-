'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { OpenStatusBadge } from '@/components/OpenStatusBadge';
import { ShoppingBag, Phone, UtensilsCrossed } from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/utils';

interface HeaderProps {
  restaurantName?: string;
  phone?: string;
  logoUrl?: string | null;
  isAcceptingOrders?: boolean;
  openingTime?: string;
  closingTime?: string;
  orderCutoffMinutes?: number;
}

export function Header({
  restaurantName = 'Josh',
  phone = '+91 98765 43210',
  logoUrl = null,
  isAcceptingOrders = true,
  openingTime = '07:00:00',
  closingTime = '23:00:00',
  orderCutoffMinutes = 20,
}: HeaderProps) {
  const { itemCount, subtotalPaise, setIsCartDrawerOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${restaurantName} logo`}
                  width={48}
                  height={48}
                  priority
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover bg-black shadow-md group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-md shadow-black/20 group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                  {restaurantName}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 tracking-wider uppercase">
                  South Indian • Vizag
                </span>
              </div>
            </Link>

            {/* Desktop Open Status Badge */}
            <div className="hidden md:block pl-2">
              <OpenStatusBadge
                isAcceptingOrders={isAcceptingOrders}
                openingTime={openingTime}
                closingTime={closingTime}
                orderCutoffMinutes={orderCutoffMinutes}
              />
            </div>
          </div>

          {/* Right Navigation & Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Click-to-call Phone */}
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs sm:text-sm font-medium transition"
              aria-label={`Call restaurant at ${phone}`}
            >
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>{phone}</span>
            </a>

            {/* Menu Link */}
            <Link
              href="/menu"
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Menu
            </Link>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative inline-flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-dark active:scale-95 text-white font-medium text-xs sm:text-sm shadow-md shadow-brand/20 transition"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline font-bold">Cart</span>

              {itemCount > 0 && (
                <span className="inline-flex items-center justify-center bg-white text-brand text-xs font-black px-1.5 py-0.5 rounded-full shadow-xs">
                  {itemCount}
                </span>
              )}

              {subtotalPaise > 0 && (
                <span className="hidden md:inline text-xs font-semibold pl-1 border-l border-amber-500/50">
                  {formatPaiseToRupees(subtotalPaise)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Open Badge strip */}
        <div className="md:hidden py-1.5 border-t border-stone-100 dark:border-stone-900 flex justify-center">
          <OpenStatusBadge
            isAcceptingOrders={isAcceptingOrders}
            openingTime={openingTime}
            closingTime={closingTime}
            orderCutoffMinutes={orderCutoffMinutes}
          />
        </div>
      </div>
    </header>
  );
}
