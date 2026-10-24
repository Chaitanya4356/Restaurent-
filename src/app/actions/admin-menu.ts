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

/** Which migration adds a given settings column. */
function migrationForColumn(column: string): string {
  if (column.startsWith('upi_')) return 'supabase/migrations/001_upi_payment_settings.sql';
  if (column === 'delivery_pincode') return 'supabase/migrations/002_delivery_pincodes.sql';
  if (column === 'delivery_radius_km') return 'supabase/migrations/003_delivery_radius.sql';
  if (column.startsWith('outlet_') || column === 'prep_time_minutes' || column === 'avg_speed_kmh') {
    return 'supabase/migrations/004_delivery_eta.sql';
  }
  if (column === 'brand_favicon_url') return 'supabase/migrations/006_favicon.sql';
  return 'supabase/migrations/RUN_ALL_PENDING.sql';
}

/** Pulls the offending column name out of a PostgREST/Postgres error. */
function missingColumnFrom(message: string): string | null {
  const candidates = [
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
    /column "([a-zA-Z0-9_]+)" of relation/i,
    /column ([a-zA-Z0-9_]+) does not exist/i,
  ];

  for (const pattern of candidates) {
    const match = message.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Updates restaurant settings (operating hours, accepting orders switch, delivery fee, etc.).
 *
 * If a newer column is missing (a migration has not been run yet), the missing
 * column is dropped from the payload and the update is retried - so one absent
 * column never blocks every other setting. The caller receives a `warning`
 * naming the exact migration to run.
 */
export async function updateRestaurantSettings(
  settings: Partial<RestaurantSettings>
): Promise<{ success: boolean; warning?: string; error?: string }> {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      ...settings,
      updated_at: new Date().toISOString(),
    };

    const skipped: string[] = [];
    const attempt: Record<string, unknown> = { ...payload };
    let lastError: { message: string } | null = null;

    for (let i = 0; i < 8; i += 1) {
      const { error } = await supabase
        .from('restaurant_settings')
        .update(attempt)
        .eq('id', 1);

      if (!error) {
        lastError = null;
        break;
      }

      lastError = error;
      const column = missingColumnFrom(error.message);

      // Only retry when the failure is a missing column we actually sent.
      if (!column || !(column in attempt)) break;

      delete attempt[column];
      skipped.push(column);
    }

    if (lastError) {
      return { success: false, error: lastError.message };
    }

    revalidatePath('/');
    revalidatePath('/menu');
    revalidatePath('/checkout');
    revalidatePath('/contact');
    revalidatePath('/admin/settings');

    if (skipped.length > 0) {
      const migrations = [...new Set(skipped.map(migrationForColumn))];
      return {
        success: true,
        warning:
          `Saved. ${skipped.join(', ')} could not be stored because the database is missing ` +
          `${skipped.length === 1 ? 'that column' : 'those columns'} - run ${migrations.join(' and ')} in the Supabase SQL editor, then save again.`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update restaurant settings' };
  }
}
