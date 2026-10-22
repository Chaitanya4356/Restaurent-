'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertStaff } from '@/lib/auth/require-staff';
import type { MenuItem, RestaurantSettings } from '@/types/database';
import { revalidatePath } from 'next/cache';

/**
 * Staff server actions for menu and restaurant settings management.
 *
 * SECURITY: these actions run with the Supabase SERVICE ROLE key (RLS bypassed),
 * so each one starts with a secure `assertStaff()` check. Without it, an
 * anonymous visitor could rewrite prices, delete dishes or disable the store.
 */

/**
 * Toggles the is_sold_out status for a dish with 1-click.
 */
export async function toggleSoldOut(itemId: string, isSoldOut: boolean) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('menu_items')
      .update({
        is_sold_out: isSoldOut,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/menu');
    revalidatePath('/admin/menu');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update item availability' };
  }
}

/**
 * Adds or updates a menu item.
 */
export async function upsertMenuItem(item: Partial<MenuItem> & { name: string; category_id: string; price_paise: number; dietary_type: 'veg' | 'non-veg' }) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();

    const payload = {
      ...item,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (item.id) {
      result = await supabase.from('menu_items').update(payload).eq('id', item.id);
    } else {
      result = await supabase.from('menu_items').insert(payload);
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    revalidatePath('/menu');
    revalidatePath('/admin/menu');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save menu item' };
  }
}

/**
 * Deletes a menu item.
 */
export async function deleteMenuItem(itemId: string) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/menu');
    revalidatePath('/admin/menu');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete menu item' };
  }
}

/**
 * Updates restaurant settings (operating hours, accepting orders switch, delivery fee, etc.).
 */
export async function updateRestaurantSettings(settings: Partial<RestaurantSettings>) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('restaurant_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/menu');
    revalidatePath('/checkout');
    revalidatePath('/contact');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update restaurant settings' };
  }
}
