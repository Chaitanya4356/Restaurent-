import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Receipt, ShoppingBag, User } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/customer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatPaiseToRupees } from '@/lib/utils';
import { ProfileForm } from '@/components/ProfileForm';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'My account | Josh Restaurant',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireCustomer('/account');

  // Cookie-scoped client: RLS limits everything here to this customer.
  const supabase = await createServerSupabaseClient();

  const [{ data: profile }, { data: orderRows }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, default_address').eq('id', user.id).maybeSingle(),
    supabase.from('orders').select('total_paise').eq('user_id', user.id),
  ]);

  const orders = orderRows ?? [];
  const totalSpent = orders.reduce((sum, order) => sum + (order.total_paise ?? 0), 0);

  const displayName = profile?.full_name || user.name || user.email?.split('@')[0] || 'there';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <SignOutButton />
      </div>

      {/* Greeting */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 dark:bg-amber-950/60 text-brand flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Hi {displayName.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-stone-500">{user.email}</p>
        </div>
      </div>

      {/* My Orders shortcut - the dedicated screen */}
      <Link
        href="/my-orders"
        className="block p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:border-amber-400 transition group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-700 transition">
                My Orders
              </p>
              <p className="text-[11px] text-stone-500">
                {orders.length === 0
                  ? 'No orders yet'
                  : `${orders.length} order${orders.length === 1 ? '' : 's'} · ${formatPaiseToRupees(
                      totalSpent
                    )} spent`}
              </p>
            </div>
          </div>
          <span className="text-stone-300 dark:text-stone-600 group-hover:text-amber-500 transition">→</span>
        </div>
      </Link>

      {/* Profile details */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Your details</h2>
          <p className="text-[11px] text-stone-500">
            New orders start with these details, so checkout takes seconds.
          </p>
        </div>

        <ProfileForm
          initialName={profile?.full_name ?? user.name ?? ''}
          initialPhone={profile?.phone ?? ''}
          initialAddress={profile?.default_address ?? ''}
        />
      </div>

      {/* Browse menu */}
      <Link
        href="/menu"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-bold text-sm hover:border-amber-500 transition"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Browse the menu</span>
      </Link>
    </div>
  );
}
