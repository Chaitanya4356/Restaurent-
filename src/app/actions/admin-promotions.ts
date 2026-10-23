'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertStaff } from '@/lib/auth/require-staff';
import { revalidatePath } from 'next/cache';

/**
 * Staff CRUD for promotions.
 *
 * Every action runs with the service-role key (RLS bypassed), so each one is
 * guarded by assertStaff(). Validation happens here, never in the browser.
 */

const MIGRATION_HINT =
  'The promotions table does not exist yet. Open Supabase → SQL Editor and run supabase/migrations/005_promotions_and_customer_accounts.sql, then try again.';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const promotionSchema = z
  .object({
    name: z.string().trim().min(2, 'Give the offer a name').max(80),
    description: z.string().trim().max(200, 'Description is too long').optional().nullable(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, 'Code must be 3-40 characters: letters, numbers, - or _')
      .optional()
      .nullable(),
    discount_type: z.enum(['percent', 'flat', 'free_delivery']),
    /** percent: 1-100. flat: paise. free_delivery: ignored. */
    discount_value: z.number().int().min(1).max(1000000),
    max_discount_paise: z.number().int().min(0).nullable().optional(),
    min_order_paise: z.number().int().min(0),
    order_type: z.enum(['any', 'delivery', 'pickup']),
    is_auto_apply: z.boolean(),
    starts_at: z.string().datetime().nullable().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    time_from: z.string().regex(timePattern).nullable().optional(),
    time_to: z.string().regex(timePattern).nullable().optional(),
    total_redemption_limit: z.number().int().min(0),
    per_customer_limit: z.number().int().min(0),
    budget_cap_paise: z.number().int().min(0).nullable().optional(),
    priority: z.number().int().min(0).max(1000),
    is_active: z.boolean(),
  })
  .refine((data) => (data.discount_type === 'percent' ? data.discount_value <= 100 : true), {
    message: 'A percentage discount cannot exceed 100%',
    path: ['discount_value'],
  })
  .refine((data) => !!data.code || data.is_auto_apply, {
    message: 'Either add a coupon code or enable "apply automatically"',
    path: ['is_auto_apply'],
  })
  .refine(
    (data) =>
      !data.starts_at || !data.ends_at || new Date(data.ends_at) > new Date(data.starts_at),
    { message: 'The end date must be after the start date', path: ['ends_at'] }
  )
  .refine(
    (data) => (!data.time_from && !data.time_to) || (!!data.time_from && !!data.time_to),
    { message: 'Set both a start and end time, or neither', path: ['time_to'] }
  );

export type PromotionInput = z.infer<typeof promotionSchema>;

function toPayload(input: PromotionInput) {
  return {
    name: input.name,
    description: input.description?.trim() || null,
    code: input.code ? input.code.toUpperCase() : null,
    discount_type: input.discount_type,
    discount_value:
      input.discount_type === 'free_delivery' ? 1 : Math.round(input.discount_value),
    max_discount_paise:
      input.discount_type === 'percent' && input.max_discount_paise
        ? Math.round(input.max_discount_paise)
        : null,
    min_order_paise: Math.round(input.min_order_paise ?? 0),
    order_type: input.order_type,
    is_auto_apply: input.code ? false : input.is_auto_apply,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    days_of_week:
      input.days_of_week && input.days_of_week.length > 0 ? input.days_of_week : null,
    time_from: input.time_from || null,
    time_to: input.time_to || null,
    total_redemption_limit: Math.round(input.total_redemption_limit ?? 0),
    per_customer_limit: Math.round(input.per_customer_limit ?? 0),
    budget_cap_paise: input.budget_cap_paise ? Math.round(input.budget_cap_paise) : null,
    priority: Math.round(input.priority ?? 100),
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };
}

export async function createPromotion(input: PromotionInput) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = promotionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid offer' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('promotions').insert(toPayload(parsed.data));

    if (error) {
      if (/schema cache|does not exist/i.test(error.message)) {
        return { success: false, error: MIGRATION_HINT };
      }
      if (/duplicate key/i.test(error.message)) {
        return { success: false, error: 'That coupon code already exists.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/offers');
    revalidatePath('/checkout');
    return { success: true };
  } catch (e) {
    console.error('Failed to create promotion:', e);
    return { success: false, error: 'Failed to create the offer' };
  }
}

export async function updatePromotion(id: string, input: PromotionInput) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!id) return { success: false, error: 'Missing offer id' };

    const parsed = promotionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid offer' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('promotions')
      .update(toPayload(parsed.data))
      .eq('id', id);

    if (error) {
      if (/schema cache|does not exist/i.test(error.message)) {
        return { success: false, error: MIGRATION_HINT };
      }
      if (/duplicate key/i.test(error.message)) {
        return { success: false, error: 'That coupon code already exists.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/offers');
    revalidatePath('/checkout');
    return { success: true };
  } catch (e) {
    console.error('Failed to update promotion:', e);
    return { success: false, error: 'Failed to update the offer' };
  }
}

export async function setPromotionActive(id: string, isActive: boolean) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/offers');
    revalidatePath('/checkout');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update the offer' };
  }
}

export async function deletePromotion(id: string) {
  try {
    const auth = await assertStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = createAdminClient();
    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/admin/offers');
    revalidatePath('/checkout');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete the offer' };
  }
}
