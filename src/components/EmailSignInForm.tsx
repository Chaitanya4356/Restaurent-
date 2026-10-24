'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, MailCheck, ShieldAlert } from 'lucide-react';

/**
 * Passwordless email sign-in (free).
 *
 * Works without any Google/Cloud setup because Supabase's email provider is
 * already enabled, and it gives customers who don't use Google a way in.
 * The emailed link comes back through /auth/callback with a one-time code.
 */
export function EmailSignInForm({ nextPath = '/account' }: { nextPath?: string }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo },
      });

      if (otpError) {
        setError(
          /rate limit|too many/i.test(otpError.message)
            ? 'Too many sign-in emails just now. Please wait a few minutes and try again.'
            : otpError.message
        );
        setIsLoading(false);
        return;
      }

      setSent(true);
      setIsLoading(false);
    } catch (e) {
      console.error('Email sign-in failed:', e);
      setError('Could not send the sign-in link. Please try again.');
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <MailCheck className="w-4 h-4" />
          Check your inbox
        </p>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="text-[11px] underline font-semibold pt-1"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="signinEmail" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
        Or sign in with an email link
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="signinEmail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          <span>Send link</span>
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      <p className="text-[10px] text-stone-500">
        No password needed — we email you a one-time sign-in link.
      </p>
    </form>
  );
}
