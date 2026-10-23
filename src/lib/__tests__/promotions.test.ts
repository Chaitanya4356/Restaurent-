import { describe, it, expect } from 'vitest';
import { allocateDiscount } from '@/lib/promotions/allocate';
import { evaluatePromotions } from '@/lib/promotions/evaluate';
import type { CartLine, EvaluationContext, Promotion } from '@/lib/promotions/types';

/** Wednesday 21 Oct 2026, 16:00 IST (UTC+5:30). */
const WED_4PM_IST = new Date(Date.UTC(2026, 9, 21, 10, 30));
const THU_4PM_IST = new Date(Date.UTC(2026, 9, 22, 10, 30));

const LINES: CartLine[] = [
  { menuItemId: 'item-a', categoryId: 'tiffins', name: 'Masala Dosa', pricePaise: 7000, quantity: 2 },
  { menuItemId: 'item-b', categoryId: 'biryanis', name: 'Chicken Biryani', pricePaise: 24000, quantity: 1 },
];

const SUBTOTAL = 7000 * 2 + 24000; // 38000 paise = ₹380

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    name: 'Test Offer',
    description: null,
    code: null,
    discount_type: 'percent',
    discount_value: 10,
    max_discount_paise: null,
    applies_to: 'order',
    min_order_paise: 0,
    order_type: 'any',
    customer_segment: 'all',
    starts_at: null,
    ends_at: null,
    days_of_week: null,
    time_from: null,
    time_to: null,
    total_redemption_limit: 0,
    per_customer_limit: 0,
    times_redeemed: 0,
    budget_cap_paise: null,
    discount_given_paise: 0,
    is_stackable: false,
    priority: 100,
    is_auto_apply: true,
    is_active: true,
    items: [],
    ...overrides,
  };
}

function context(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    orderType: 'delivery',
    deliveryFeePaise: 5000,
    now: WED_4PM_IST,
    ...overrides,
  };
}

describe('discount allocation', () => {
  it('splits proportionally and sums exactly to the discount', () => {
    const allocation = allocateDiscount(10000, [
      { menuItemId: 'a', amountPaise: 14000 },
      { menuItemId: 'b', amountPaise: 24000 },
    ]);

    expect(allocation.a + allocation.b).toBe(10000);
    expect(allocation.a).toBe(3684); // 10000 * 14000 / 38000 = 3684.2
    expect(allocation.b).toBe(6316);
  });

  it('gives the leftover paise to the line with the largest remainder', () => {
    // 3 equal lines, ₹100 discount -> 3333 each = 9999, one paise left
    const allocation = allocateDiscount(10000, [
      { menuItemId: 'a', amountPaise: 10000 },
      { menuItemId: 'b', amountPaise: 10000 },
      { menuItemId: 'c', amountPaise: 10000 },
    ]);

    const values = Object.values(allocation);
    expect(values.reduce((s, v) => s + v, 0)).toBe(10000);
    expect(values.filter((v) => v === 3334)).toHaveLength(1);
    expect(values.filter((v) => v === 3333)).toHaveLength(2);
  });

  it('never allocates more than a line is worth', () => {
    const allocation = allocateDiscount(5000, [
      { menuItemId: 'a', amountPaise: 100 },
      { menuItemId: 'b', amountPaise: 4900 },
    ]);

    expect(allocation.a).toBeLessThanOrEqual(100);
    expect(allocation.b).toBeLessThanOrEqual(4900);
    expect(allocation.a + allocation.b).toBe(5000);
  });

  it('clamps the discount to the cart total', () => {
    const allocation = allocateDiscount(999999, [{ menuItemId: 'a', amountPaise: 1000 }]);
    expect(allocation.a).toBe(1000);
  });

  it('handles zero discount and empty carts', () => {
    expect(allocateDiscount(0, [{ menuItemId: 'a', amountPaise: 1000 }])).toEqual({ a: 0 });
    expect(allocateDiscount(5000, [])).toEqual({});
  });
});

describe('promotion evaluation', () => {
  it('applies a percentage discount across all items', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_value: 10 })],
      context: context(),
    });

    expect(quote.totals.subtotalPaise).toBe(SUBTOTAL);
    expect(quote.totals.itemDiscountPaise).toBe(3800);
    expect(quote.totals.totalPaise).toBe(SUBTOTAL - 3800 + 5000);

    const allocation = quote.applied?.allocation ?? {};
    expect((allocation['item-a'] ?? 0) + (allocation['item-b'] ?? 0)).toBe(3800);
  });

  it('respects the maximum discount cap', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_value: 50, max_discount_paise: 10000 })],
      context: context(),
    });

    expect(quote.totals.itemDiscountPaise).toBe(10000); // capped
  });

  it('applies a flat discount, never more than the cart', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_type: 'flat', discount_value: 5000 })],
      context: context(),
    });
    expect(quote.totals.itemDiscountPaise).toBe(5000);

    const huge = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_type: 'flat', discount_value: 999999 })],
      context: context(),
    });
    expect(huge.totals.itemDiscountPaise).toBe(SUBTOTAL);
    expect(huge.totals.totalPaise).toBe(0 + 5000);
  });

  it('explains how much more is needed to reach the minimum order', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ min_order_paise: 50000 })],
      context: context(),
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toMatch(/Add ₹120 more to use this offer/);
  });

  it('honours the order-type restriction', () => {
    const deliveryOnly = promotion({ order_type: 'delivery' });
    const pickupOnly = promotion({ order_type: 'pickup' });

    expect(
      evaluatePromotions({ lines: LINES, promotions: [deliveryOnly], context: context({ orderType: 'delivery' }) })
        .applied
    ).not.toBeNull();

    const wrong = evaluatePromotions({
      lines: LINES,
      promotions: [pickupOnly],
      context: context({ orderType: 'delivery' }),
    });
    expect(wrong.applied).toBeNull();
    expect(wrong.rejected[0].reason).toBe('Valid on pickup orders only.');
  });

  it('respects start and end dates', () => {
    const notStarted = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ starts_at: '2026-12-01T00:00:00Z' })],
      context: context(),
    });
    expect(notStarted.rejected[0].reason).toMatch(/has not started/);

    const ended = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ ends_at: '2026-01-01T00:00:00Z' })],
      context: context(),
    });
    expect(ended.rejected[0].reason).toBe('This offer has ended.');
  });

  it('respects day-of-week and happy-hour windows (IST)', () => {
    const wednesday = promotion({ days_of_week: [3] });
    expect(
      evaluatePromotions({ lines: LINES, promotions: [wednesday], context: context({ now: WED_4PM_IST }) }).applied
    ).not.toBeNull();
    expect(
      evaluatePromotions({ lines: LINES, promotions: [wednesday], context: context({ now: THU_4PM_IST }) }).applied
    ).toBeNull();

    const happyHour = promotion({ time_from: '15:00:00', time_to: '18:00:00' });
    expect(
      evaluatePromotions({ lines: LINES, promotions: [happyHour], context: context({ now: WED_4PM_IST }) }).applied
    ).not.toBeNull();
    expect(
      evaluatePromotions({
        lines: LINES,
        promotions: [happyHour],
        context: context({ now: new Date(Date.UTC(2026, 9, 21, 15, 0)) }), // 20:30 IST
      }).applied
    ).toBeNull();
  });

  it('stops offering once the total redemption limit is reached', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ total_redemption_limit: 50, times_redeemed: 50 })],
      context: context(),
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toBe('This offer has reached its limit.');
  });

  it('enforces per-customer limits from the redemption history', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ id: 'promo-x', per_customer_limit: 1 })],
      context: context({ customerRedemptions: { 'promo-x': 1 } }),
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toMatch(/once per customer/);
  });

  it('auto-pauses when the discount budget is exhausted', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ budget_cap_paise: 100000, discount_given_paise: 100000 })],
      context: context(),
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toBe('This offer is no longer available.');
  });

  it('picks the best automatic offer for the customer', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({ id: 'small', name: 'Small', discount_value: 5 }),
        promotion({ id: 'big', name: 'Big', discount_value: 15 }),
        promotion({ id: 'coded', name: 'Coded', code: 'SAVE20', discount_value: 20, is_auto_apply: false }),
      ],
      context: context(),
    });

    expect(quote.applied?.name).toBe('Big');
    expect(quote.totals.itemDiscountPaise).toBe(5700); // 15% of 38000
  });

  it('applies a typed code even when an automatic offer exists', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({ id: 'auto', name: 'Auto 10%', discount_value: 10 }),
        promotion({ id: 'coded', name: 'Code 25%', code: 'JOSH25', discount_value: 25, is_auto_apply: false }),
      ],
      context: context(),
      code: 'josh25',
    });

    expect(quote.applied?.name).toBe('Code 25%');
    expect(quote.codeError).toBeNull();
  });

  it('warns when a better automatic offer existed than the typed code', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({ id: 'auto', name: 'Auto 20%', discount_value: 20 }),
        promotion({ id: 'coded', name: 'Code 5%', code: 'SMALL5', discount_value: 5, is_auto_apply: false }),
      ],
      context: context(),
      code: 'SMALL5',
    });

    expect(quote.applied?.name).toBe('Code 5%');
    expect(quote.betterAutoOffer?.name).toBe('Auto 20%');
  });

  it('explains an unknown or unusable code and falls back to auto offers', () => {
    const unknown = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ id: 'auto', name: 'Auto 10%', discount_value: 10 })],
      context: context(),
      code: 'NOPE',
    });
    expect(unknown.codeError).toMatch(/not valid/);
    expect(unknown.applied?.name).toBe('Auto 10%');

    const tooSmall = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({ id: 'coded', name: 'Big Order', code: 'BIG', min_order_paise: 100000, is_auto_apply: false }),
      ],
      context: context(),
      code: 'BIG',
    });
    expect(tooSmall.codeError).toMatch(/Add ₹620 more/);
    expect(tooSmall.applied).toBeNull();
  });

  it('waives the delivery fee for free-delivery offers, delivery orders only', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_type: 'free_delivery', name: 'Free delivery' })],
      context: context(),
    });

    expect(quote.applied?.freeDelivery).toBe(true);
    expect(quote.totals.deliveryFeePaise).toBe(0);
    expect(quote.totals.savingsPaise).toBe(5000);

    const pickup = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_type: 'free_delivery' })],
      context: context({ orderType: 'pickup', deliveryFeePaise: 0 }),
    });
    expect(pickup.applied).toBeNull();
  });

  it('scopes discounts to a category and allocates only to those lines', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({
          applies_to: 'category',
          discount_value: 50,
          items: [{ menu_item_id: null, category_id: 'tiffins' }],
        }),
      ],
      context: context(),
    });

    // Only the dosas (14000) qualify -> 50% = 7000
    expect(quote.totals.itemDiscountPaise).toBe(7000);
    expect(quote.applied?.allocation['item-a']).toBe(7000);
    expect(quote.applied?.allocation['item-b']).toBeUndefined();
  });

  it('rejects scoped offers when no cart line qualifies', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [
        promotion({
          applies_to: 'category',
          items: [{ menu_item_id: null, category_id: 'beverages' }],
        }),
      ],
      context: context(),
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toMatch(/No eligible items/);
  });

  it('flags segment offers that need an account', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ customer_segment: 'first_order' })],
      context: context(), // isFirstOrder undefined
    });

    expect(quote.applied).toBeNull();
    expect(quote.rejected[0].reason).toBe('Sign in to use this offer.');
  });

  it('returns a consistent totals breakdown', () => {
    const quote = evaluatePromotions({
      lines: LINES,
      promotions: [promotion({ discount_value: 10 })],
      context: context(),
    });

    expect(quote.totals).toEqual({
      subtotalPaise: 38000,
      itemDiscountPaise: 3800,
      deliveryFeePaise: 5000,
      totalPaise: 39200,
      savingsPaise: 3800,
    });
  });
});
