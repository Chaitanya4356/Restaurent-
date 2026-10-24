'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * "Continue with Google" - free, unlimited, no SMS or OTP charges.
 * Uses Supabase OAuth; the session is written to cookies by the callback route.
 */
export function GoogleSignInButton({ nextPath = '/account' }: { nextPath?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) {
        setError(
          /provider is not enabled/i.test(oauthError.message)
            ? 'Google sign-in is not configured yet. Ask the owner to enable the Google provider in Supabase.'
            : oauthError.message
        );
        setIsLoading(false);
      }
      // On success the browser navigates to Google.
    } catch (e) {
      console.error('Google sign-in failed:', e);
      setError('Could not start Google sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-60 text-stone-800 dark:text-stone-100 font-bold text-sm shadow-sm transition"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.9l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
        )}
        <span>{isLoading ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
