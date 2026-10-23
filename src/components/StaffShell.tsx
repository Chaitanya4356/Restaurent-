'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChefHat,
  Utensils,
  Settings,
  LogOut,
  ExternalLink,
  Flame,
  Tag,
} from 'lucide-react';

/**
 * Staff portal shell (kitchen tablet / owner screen).
 *
 * Visually and functionally isolated from the customer storefront:
 * no customer header, no cart drawer, no public footer, and the whole
 * surface is marked `noindex` by the parent `(staff)` layout.
 */
export default function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login screen renders standalone (no staff chrome).
  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-stone-100 dark:bg-stone-950 p-4">{children}</div>;
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const navItems = [
    { href: '/admin/orders', label: 'Kitchen Orders', icon: ChefHat },
    { href: '/admin/menu', label: 'Menu Manager', icon: Utensils },
    { href: '/admin/offers', label: 'Offers', icon: Tag },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight">Josh Kitchen Portal</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-sm">
                STAFF LIVE
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 text-xs text-stone-400 hover:text-white transition"
              title="Open public website in new tab"
            >
              <span>Customer Site</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
