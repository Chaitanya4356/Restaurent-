import { describe, it, expect } from 'vitest';
import { isPincodeServiceable, PINCODE_PATTERN } from '@/lib/delivery';

/**
 * Delivery serviceability rules.
 *
 * An empty allow-list means "not configured yet" and must NOT block delivery -
 * otherwise deploying this feature before the owner adds pincodes would take
 * the restaurant offline.
 */
describe('delivery serviceability', () => {
  const allowed = [{ pincode: '530003' }, { pincode: '530016' }];

  it('accepts a pincode that is on the allow-list', () => {
    expect(isPincodeServiceable('530003', allowed)).toBe(true);
    expect(isPincodeServiceable('530016', allowed)).toBe(true);
  });

  it('rejects a pincode that is not on the allow-list', () => {
    expect(isPincodeServiceable('530999', allowed)).toBe(false);
    expect(isPincodeServiceable('', allowed)).toBe(false);
  });

  it('allows every pincode when no allow-list is configured', () => {
    expect(isPincodeServiceable('530999', [])).toBe(true);
    expect(isPincodeServiceable('110001', [])).toBe(true);
  });

  it('validates the pincode format', () => {
    for (const good of ['530003', '110001', '700001']) {
      expect(PINCODE_PATTERN.test(good)).toBe(true);
    }

    for (const bad of ['53000', '5300003', '030003', 'abcdef', '']) {
      expect(PINCODE_PATTERN.test(bad)).toBe(false);
    }
  });
});
