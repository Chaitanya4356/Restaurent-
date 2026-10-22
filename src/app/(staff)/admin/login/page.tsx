import type { Metadata } from 'next';
import { StaffLoginForm } from '@/components/StaffLoginForm';

/**
 * Staff sign-in screen.
 *
 * This is the ONLY staff page that does not require an existing session.
 * It is a server component so the sign-in form is part of the rendered HTML
 * (no Suspense fallback) and so the `next` destination can be sanitised
 * before it ever reaches the browser.
 */
export const metadata: Metadata = {
  title: 'Staff Sign In | Josh Restaurant',
};

interface AdminLoginPageProps {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;

  // Only internal staff paths are accepted - blocks open-redirect abuse.
  const nextPath =
    rawNext && rawNext.startsWith('/admin') && !rawNext.startsWith('//') ? rawNext : '/admin/orders';

  return <StaffLoginForm nextPath={nextPath} accessDenied={rawError === 'not_staff'} />;
}
