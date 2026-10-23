import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluatePromotions } from './evaluate';
import type { CartLine, Promotion, PromotionQuote, PromotionItemScope } from './types';

/**
 * Server-only promotion access.
 *
 * Promotions are read with the service role and never exposed to the browser:
 * coupon codes must not be discoverable by inspecting network traffic.
 */

interface PromotionRow extends Promotion {
  promotion_items?: PromotionItemScope[] | null;
}

export const getActivePromotions = cache(async (): Promise<Promotion[]> => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('promotions')
      .select('*, promotion_items(menu_item_id, category_id)')
      .eq('is_active', true);

    if (error) {
      // Pre-migration this table does not exist yet - treat as "no offers".
      console.warn('Promotions unavailable (has migration 005 been run?):', error.message);
      return [];
    }

    return ((data ?? []) as PromotionRow[]).map((row) => ({
      ...row,
      items: row.promotion_items ?? [],
    }));
  } catch (e) {
    console.error('Failed to load promotions:', e);
    return [];
  }
});

/** promotionId -> how many times this phone / account has used it. */
export async function getCustomerRedemptions(
  phone?: string | null,
  userId?: string | null
): Promise<Record<string, number>> {
  if (!phone && !userId) return {};

  try {
    const supabase = createAdminClient();

    let query = supabase.from('promotion_redemptions').select('promotion_id');
    query = userId
      ? query.eq('customer_user_id', userId)
      : query.eq('customer_phone', phone as string);

    const { data, error } = await query;
    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data as Array<{ promotion_id: string }>) {
      counts[row.promotion_id] = (counts[row.promotion_id] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

/** Whether this phone / account has never ordered before (best effort). */
async function lookupIsFirstOrder(
  phone?: string | null,
  userId?: string | null
): Promise<boolean | undefined> {
  if (!phone && !userId) return undefined;

  try {
    const supabase = createAdminClient();
    let query = supabase.from('orders').select('id', { count: 'exact', head: true });
    query = userId ? query.eq('user_id', userId) : query.eq('customer_phone', phone as string);

    const { count, error } = await query;
    if (error) return undefined;
    return (count ?? 0) === 0;
  } catch {
    return undefined;
  }
}

export interface EvaluateCartParams {
  lines: CartLine[];
  orderType: 'delivery' | 'pickup';
  deliveryFeePaise: number;
  code?: string | null;
  phone?: string | null;
  userId?: string | null;
}

/**
 * Loads promotions + customer context and evaluates the cart.
 * Returns null when no promotions are configured at all.
 */
export async function evaluateCart(params: EvaluateCartParams): Promise<PromotionQuote | null> {
  const promotions = await getActivePromotions();
  if (promotions.length === 0) return null;

  const needsOrderHistory = promotions.some(
    (p) => p.customer_segment === 'first_order' || p.customer_segment === 'returning'
  );

  const [customerRedemptions, isFirstOrder] = await Promise.all([
    getCustomerRedemptions(params.phone, params.userId),
    needsOrderHistory ? lookupIsFirstOrder(params.phone, params.userId) : Promise.resolve(undefined),
  ]);

  return evaluatePromotions({
    lines: params.lines,
    promotions,
    code: params.code,
    context: {
      orderType: params.orderType,
      deliveryFeePaise: params.deliveryFeePaise,
      customerPhone: params.phone ?? null,
      customerUserId: params.userId ?? null,
      customerRedemptions,
      isFirstOrder,
      hasLoyaltyPass: false, // phase C: read from loyalty_passes
      now: new Date(),
    },
  });
}
