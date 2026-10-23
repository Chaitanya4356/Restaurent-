'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDeliveryFee } from '@/lib/pricing';
import { getPublicSettings } from '@/lib/settings';
import { evaluateCart } from '@/lib/promotions/server';
import type { CartLine } from '@/lib/promotions/types';

/**
 * Live order quote: prices + delivery fee + the best promotion.
 *
 * Like placeOrder(), this NEVER trusts browser prices - it re-reads every item
 * from the database. The browser only sends ids and quantities.
 */

const quoteSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.guid(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
  orderType: z.enum(['delivery', 'pickup']),
  code: z.string().trim().max(40).optional(),
  customerPhone: z.string().trim().max(20).optional(),
});

export interface OrderQuote {
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  savingsPaise: number;
  applied: {
    promotionId: string;
    name: string;
    code: string | null;
    freeDelivery: boolean;
  } | null;
  codeError: string | null;
  betterAutoOffer: { name: string; totalSavingPaise: number } | null;
  /** Automatic offers the customer can get without typing anything. */
  offers: Array<{ name: string; description: string | null; savingPaise: number }>;
}

export async function quoteOrder(input: {
  items: Array<{ menuItemId: string; quantity: number }>;
  orderType: 'delivery' | 'pickup';
  code?: string;
  customerPhone?: string;
}): Promise<OrderQuote> {
  const parsed = quoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      subtotalPaise: 0,
      discountPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: 0,
      savingsPaise: 0,
      applied: null,
      codeError: null,
      betterAutoOffer: null,
      offers: [],
    };
  }

  const { items, orderType, code, customerPhone } = parsed.data;

  try {
    const supabase = createAdminClient();

    // Authoritative prices
    const { data: dbItems } = await supabase
      .from('menu_items')
      .select('id, name, price_paise, category_id, is_active, is_sold_out')
      .in(
        'id',
        items.map((item) => item.menuItemId)
      );

    const byId = new Map((dbItems ?? []).map((row) => [row.id, row]));

    const lines: CartLine[] = [];
    for (const item of items) {
      const row = byId.get(item.menuItemId);
      if (!row || !row.is_active) continue;

      lines.push({
        menuItemId: row.id,
        categoryId: row.category_id,
        name: row.name,
        pricePaise: row.price_paise,
        quantity: item.quantity,
      });
    }

    if (lines.length === 0) {
      return {
        subtotalPaise: 0,
        discountPaise: 0,
        deliveryFeePaise: 0,
        totalPaise: 0,
        savingsPaise: 0,
        applied: null,
        codeError: null,
        betterAutoOffer: null,
        offers: [],
      };
    }

    const settings = await getPublicSettings();
    const subtotalPaise = lines.reduce((sum, line) => sum + line.pricePaise * line.quantity, 0);

    const baseDeliveryFee = calculateDeliveryFee(
      subtotalPaise,
      orderType,
      settings.free_delivery_threshold_paise,
      settings.delivery_fee_paise
    );

    const quote = await evaluateCart({
      lines,
      orderType,
      deliveryFeePaise: baseDeliveryFee,
      code: code || null,
      phone: customerPhone || null,
    });

    if (!quote) {
      return {
        subtotalPaise,
        discountPaise: 0,
        deliveryFeePaise: baseDeliveryFee,
        totalPaise: subtotalPaise + baseDeliveryFee,
        savingsPaise: 0,
        applied: null,
        codeError: null,
        betterAutoOffer: null,
        offers: [],
      };
    }

    return {
      subtotalPaise: quote.totals.subtotalPaise,
      discountPaise: quote.totals.itemDiscountPaise,
      deliveryFeePaise: quote.totals.deliveryFeePaise,
      totalPaise: quote.totals.totalPaise,
      savingsPaise: quote.totals.savingsPaise,
      applied: quote.applied
        ? {
            promotionId: quote.applied.promotionId,
            name: quote.applied.name,
            code: quote.applied.code,
            freeDelivery: quote.applied.freeDelivery,
          }
        : null,
      codeError: quote.codeError,
      betterAutoOffer: quote.betterAutoOffer,
      offers: quote.eligible
        .filter((entry) => !entry.code) // only automatic offers are advertised
        .map((entry) => ({
          name: entry.name,
          description: null,
          savingPaise: entry.totalSavingPaise,
        })),
    };
  } catch (e) {
    console.error('Quote failed:', e);
    return {
      subtotalPaise: 0,
      discountPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: 0,
      savingsPaise: 0,
      applied: null,
      codeError: null,
      betterAutoOffer: null,
      offers: [],
    };
  }
}
