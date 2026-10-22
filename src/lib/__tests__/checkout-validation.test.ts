import { describe, it, expect } from 'vitest';
import { checkoutFormSchema, checkoutItemSchema } from '@/lib/validation/checkout';

/**
 * Regression tests for the checkout schema.
 *
 * The live catalog uses ids like `a1111111-1111-1111-1111-111111111111` which
 * Postgres accepts as `uuid` but which are NOT RFC-4122 compliant. Zod v4's
 * `.uuid()` rejected them, so every checkout containing a seeded dish failed
 * with "Invalid menu item ID".
 */

const SEEDED_IDS = [
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
];

const VALID_ORDER = {
  orderType: 'delivery' as const,
  customerName: 'Chaitanya',
  customerPhone: '9876543210',
  deliveryAddress: 'Flat 402, Sea View Apartments, Siripuram, Visakhapatnam',
  preferredTime: 'ASAP',
  customerNotes: '',
  paymentMethod: 'upi_on_delivery' as const,
  items: SEEDED_IDS.map((menuItemId) => ({ menuItemId, quantity: 1, notes: '' })),
};

describe('checkout validation', () => {
  it('accepts every seeded (non-RFC) menu item id', () => {
    for (const id of SEEDED_IDS) {
      expect(checkoutItemSchema.safeParse({ menuItemId: id, quantity: 1 }).success).toBe(true);
    }
  });

  it('accepts a normal RFC-4122 uuid', () => {
    expect(
      checkoutItemSchema.safeParse({
        menuItemId: '0f8fad5b-d9cb-469f-a165-70867728950e',
        quantity: 2,
      }).success
    ).toBe(true);
  });

  it('rejects malformed menu item ids', () => {
    for (const id of ['not-a-uuid', '123', '', 'a1111111-1111-1111-1111-11111111111Z']) {
      expect(checkoutItemSchema.safeParse({ menuItemId: id, quantity: 1 }).success).toBe(false);
    }
  });

  it('accepts a complete delivery order built from seeded ids', () => {
    expect(checkoutFormSchema.safeParse(VALID_ORDER).success).toBe(true);
  });

  it('still enforces quantity and address rules', () => {
    expect(
      checkoutFormSchema.safeParse({
        ...VALID_ORDER,
        items: [{ menuItemId: SEEDED_IDS[0], quantity: 0 }],
      }).success
    ).toBe(false);

    expect(
      checkoutFormSchema.safeParse({ ...VALID_ORDER, deliveryAddress: 'short' }).success
    ).toBe(false);
  });
});
