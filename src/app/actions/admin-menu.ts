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
 * Settings that exist on every version of the schema. Used as a fallback when a
 * newer column is missing, so the owner can always save the rest.
 */
const CORE_SETTINGS_FIELDS = [
  'restaurant_name',
  'phone_number',
  'address',
  'city',
  'time_zone',
  'opening_time',
  'closing_time',
  'order_cutoff_minutes',
  'is_accepting_orders',
  'delivery_fee_paise',
  'free_delivery_threshold_paise',
  'min_delivery_order_paise',
  'brand_color_primary',
  'brand_logo_url',
] as const;

/**
 * Updates restaurant settings (operating hours, accepting orders switch, delivery fee, etc.).
 */
export async function updateRestaurantSettings(settings: Partial<RestaurantSettings>) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();
    const payload = {
      ...settings,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('restaurant_settings')
      .update(payload)
      .eq('id', 1);

    if (error) {
      // Graceful pre-migration fallback: newer columns (UPI, delivery radius,
      // outlet location, ETA timings) are added by supabase/migrations/*.sql.
      // Until those have been run, still save every core setting instead of
      // failing the whole form.
      const missingColumn = /schema cache|does not exist/i.test(error.message);

      if (missingColumn) {
        const corePayload: Record<string, unknown> = { updated_at: payload.updated_at };
        for (const field of CORE_SETTINGS_FIELDS) {
          if (field in payload) {
            corePayload[field] = (payload as Record<string, unknown>)[field];
          }
        }

        const { error: retryError } = await supabase
          .from('restaurant_settings')
          .update(corePayload)
          .eq('id', 1);

        if (!retryError) {
          revalidatePath('/');
          revalidatePath('/menu');
          revalidatePath('/checkout');
          revalidatePath('/contact');
          revalidatePath('/admin/settings');
          return {
            success: false,
            error:
              'Your other settings were saved, but the newer fields (UPI, delivery radius, restaurant location, ETA timings) need a one-time database update. ' +
              'Open Supabase → SQL Editor and run supabase/migrations/RUN_ALL_PENDING.sql, then save again.',
          };
        }
      }

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
