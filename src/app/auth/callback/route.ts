import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

/**
 * OAuth callback for "Continue with Google".
 *
 * Supabase redirects here with a one-time `code`; exchanging it sets the session
 * cookies, after which the customer lands on the page they originally wanted.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = safeNextPath(req.nextUrl.searchParams.get('next'), '/account');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      new URL('/account/login?error=provider', req.nextUrl.origin)
    );
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('OAuth code exchange failed:', error.message);
        return NextResponse.redirect(
          new URL('/account/login?error=exchange', req.nextUrl.origin)
        );
      }
    } catch (e) {
      console.error('OAuth callback error:', e);
      return NextResponse.redirect(
        new URL('/account/login?error=exchange', req.nextUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
