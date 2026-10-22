import type { Metadata } from 'next';
import StaffShell from '@/components/StaffShell';

/**
 * Staff / owner portal layout.
 *
 * This is a separate *surface* of the same application (not a separate
 * website or codebase):
 *  - Access  : guarded by `src/proxy.ts` (optimistic redirect) and by the
 *              `requireStaff()` data-access-layer check in every staff page
 *              and staff server action (secure check).
 *  - Visibility: never indexed by search engines, never part of the sitemap,
 *              and rendered without any customer storefront chrome.
 */
export const metadata: Metadata = {
  title: 'Staff Portal | Josh Restaurant',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
