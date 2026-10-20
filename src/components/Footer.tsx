'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Clock, Bike, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  restaurantName?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export function Footer({
  restaurantName = 'Josh',
  phone = '+91 98765 43210',
  address = 'Beach Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003',
  city = 'Visakhapatnam',
}: FooterProps) {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {restaurantName}
            </h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Authentic South Indian vegetarian tiffins and slow-dum fragrant biryanis prepared with pure desi ghee and fresh coastal spices.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Fresh Daily • FSSAI Certified</span>
            </div>
          </div>

          {/* Contact & Location Col */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Visit & Contact
            </h4>
            <div className="flex items-start gap-2.5 text-sm text-stone-400">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-stone-400">
              <Phone className="w-4 h-4 text-amber-500 shrink-0" />
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="hover:text-amber-400 transition"
              >
                {phone}
              </a>
            </div>
          </div>

          {/* Operating Hours & Delivery Policy */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Hours & Delivery
            </h4>
            <div className="flex items-start gap-2.5 text-sm text-stone-400">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-200">7:00 AM – 11:00 PM</p>
                <p className="text-xs text-stone-400">Every day of the week</p>
                <p className="text-xs text-amber-400/90 mt-0.5">
                  Last orders taken at 10:40 PM
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-stone-400 pt-1">
              <Bike className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-stone-200">20 km Radius in {city}</p>
                <p>₹40 flat fee • FREE above ₹500</p>
                <p className="text-stone-400">Min. delivery order: ₹100</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link href="/" className="hover:text-amber-400 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-amber-400 transition">
                  Full Menu
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-amber-400 transition">
                  Track Live Order
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-400 transition">
                  Contact & Location
                </Link>
              </li>
              <li className="pt-2 border-t border-stone-800 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <Link href="/privacy" className="hover:text-amber-400 transition">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/terms" className="hover:text-amber-400 transition">
                  Terms
                </Link>
                <span>•</span>
                <Link href="/refund" className="hover:text-amber-400 transition">
                  Refunds
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/admin/login"
                  className="text-xs text-stone-500 hover:text-stone-300 transition"
                >
                  🔒 Staff / Owner Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© 2026 {restaurantName} Restaurant. All rights reserved.</p>
          <div className="flex items-center gap-1 text-stone-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Vizag food lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
