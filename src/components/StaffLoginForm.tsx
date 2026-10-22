'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, KeyRound, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

/**
 * Staff sign-in form.
 *
 * The `next` destination is resolved on the SERVER (see the page component)
 * and handed down as a plain prop. This keeps the form inside the prerendered
 * HTML instead of deferring it behind a Suspense boundary, and makes an open
 * redirect impossible: only internal `/admin` paths are ever accepted.
 */
export function StaffLoginForm({
  nextPath,
  accessDenied = false,
}: {
  nextPath: string;
  accessDenied?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // `refresh()` re-renders the server components with the new session
        // cookie so the staff pages pass their secure guard.
        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      setErrorMessage('Unexpected login failure. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 sm:py-20 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-500 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Staff & Owner Portal
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Sign in to access the live kitchen dashboard, menu manager, and restaurant settings.
        </p>
      </div>

      {accessDenied && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>
            That account is not authorised for the staff portal. Sign in with a staff account, or
            ask the owner to add your email to the staff list.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md space-y-4">
        <div className="space-y-1">
          <label htmlFor="staffEmail" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            Staff Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="staffEmail"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="staff@yourrestaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="staffPassword" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="staffPassword"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Staff Credentials...</span>
            </>
          ) : (
            <span>Sign In to Dashboard</span>
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Customer Website</span>
        </Link>
      </div>
    </div>
  );
}
