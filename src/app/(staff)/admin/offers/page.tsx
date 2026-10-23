import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/require-staff';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminOffersManager } from '@/components/AdminOffersManager';
import type { Promotion } from '@/lib/promotions/types';

export const metadata: Metadata = {
  title: 'Offers & Discounts | Josh Admin',
  description: 'Create and manage restaurant offers, coupons and discount campaigns.',
};

export const dynamic = 'force-dynamic';

export default async function AdminOffersPage() {
  // SECURE GUARD: staff only.
  await requireStaff();

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('promotions')
    .select('*, promotion_items(menu_item_id, category_id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Promotions unavailable (has migration 005 been run?):', error.message);
  }

  const promotions = ((data ?? []) as Array<Promotion & { promotion_items?: unknown }>).map(
    (row) => ({
      ...row,
      items: (row.promotion_items ?? []) as Promotion['items'],
    })
  );

  return <AdminOffersManager initialPromotions={promotions} offersReady={!error} />;
}
