import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isStaffEmail } from '@/lib/auth/staff-allow-list';

/**
 * NEXT.JS 16 PROXY (formerly "middleware")
 * ---------------------------------------------------------------------------
 * Runs before every matched request. It does two things for the staff portal:
 *
 *  1. OPTIMISTIC ACCESS CHECK - if the visitor has no valid Supabase session
 *     cookie, they are redirected to `/admin/login` before any staff page or
 *     staff server action code executes. Signed-in staff hitting the login
 *     screen are bounced straight to the kitchen dashboard.
 *
 *  2. SESSION REFRESH - Supabase auth tokens are short-lived. The proxy
 *     writes refreshed cookies back onto the response so long kitchen
 *     shifts never expire mid-order.
 *
 * This is deliberately scoped to `/admin/:path*` only, so the public
 * storefront pays zero cost for it.
 *
 * IMPORTANT: the proxy is only a UX gate. The authoritative protection is the
 * secure `requireStaff()` / `assertStaff()` check in
 * `src/lib/auth/require-staff.ts`, which is applied inside every staff page
 * and every staff server action.
 */

const LOGIN_PATH = '/admin/login';
const ORDERS_PATH = '/admin/orders';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === LOGIN_PATH;

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Cannot validate sessions without config - let the request through and
    // let the secure DAL check reject it.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update the request cookie jar so downstream handlers see the
        // refreshed session.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        // Recreate the response and attach the refreshed cookies to it.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Secure validation of the session cookie against the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // AUTHORIZATION: signed in but not on the staff allow-list -> sign out and
  // explain, instead of bouncing between the dashboard and the login screen.
  if (user && !isStaffEmail(user.email)) {
    console.warn(`Blocked staff portal access for unauthorised account: ${user.email}`);
    await supabase.auth.signOut();

    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    url.searchParams.set('error', 'not_staff');

    const redirectResponse = NextResponse.redirect(url);
    // signOut() cleared the session cookies on `response` - carry them over,
    // otherwise the stale session would immediately redirect again.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));

    return redirectResponse;
  }

  // Not signed in -> send to the staff login screen.
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in -> skip the login screen.
  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = ORDERS_PATH;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
