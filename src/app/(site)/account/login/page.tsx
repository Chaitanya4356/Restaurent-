import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { getCustomerUser, safeNextPath } from '@/lib/auth/customer';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { EmailSignInForm } from '@/components/EmailSignInForm';

export const metadata: Metadata = {
  title: 'Sign in | Josh Restaurant',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function CustomerLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  // Already signed in? Go straight through.
  const user = await getCustomerUser();
  if (user) redirect(nextPath);

  return (
    <div className="max-w-md mx-auto py-12 sm:py-20 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto shadow-md">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          See your past orders, reorder in two taps and save your delivery address.
        </p>
      </div>

      {params.error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
          {params.error === 'provider'
            ? 'Google sign-in was cancelled. Please try again.'
            : 'We could not complete the sign-in. Please try again.'}
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md space-y-4">
        <GoogleSignInButton nextPath={nextPath} />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">or</span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        </div>

        <EmailSignInForm nextPath={nextPath} />

        <div className="border-t border-stone-100 dark:border-stone-800 pt-4 space-y-2 text-[11px] text-stone-500">
          <p className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>Your order history and address, private to you.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>You can still order as a guest - an account is optional.</span>
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Order without signing in</span>
        </Link>
      </div>
    </div>
  );
}
