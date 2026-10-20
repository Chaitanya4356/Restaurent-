import React from 'react';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminMenuManager } from '@/components/AdminMenuManager';
import type { Category, MenuItem } from '@/types/database';

export const metadata: Metadata = {
  title: 'Menu Manager | Josh Restaurant Admin',
  description: 'Manage dishes, prices, photos, and availability for Josh Restaurant.',
};

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  const supabase = createAdminClient();

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('categories').select('*').order('display_order', { ascending: true }),
    supabase.from('menu_items').select('*').order('display_order', { ascending: true }),
  ]);

  const categories: Category[] = categoriesRes.data || [];
  const items: MenuItem[] = itemsRes.data || [];

  return <AdminMenuManager initialCategories={categories} initialItems={items} />;
}
