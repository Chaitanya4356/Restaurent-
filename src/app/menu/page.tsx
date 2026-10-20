import type { Metadata } from 'next';
import { createPublicServerClient } from '@/lib/supabase/public';
import { MenuCatalog } from '@/components/MenuCatalog';
import type { Category, MenuItem } from '@/types/database';

export const metadata: Metadata = {
  title: 'Full Menu | Josh Restaurant Vizag',
  description:
    'Explore South Indian tiffins, dosas, idlis, and fragrant dum biryanis at Josh Restaurant. Veg and non-veg options available with fast 20km delivery in Visakhapatnam.',
};

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  let categories: Category[] = [];
  let items: MenuItem[] = [];

  try {
    const supabase = createPublicServerClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    if (categoriesRes.data) categories = categoriesRes.data;
    if (itemsRes.data) items = itemsRes.data;
  } catch (error) {
    console.error('Error fetching menu from Supabase:', error);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Our Online Menu
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Prepared fresh to order with genuine desi ghee, traditional spices, and love.
        </p>
      </div>

      {/* Menu Catalog */}
      <MenuCatalog categories={categories} items={items} />
    </div>
  );
}
