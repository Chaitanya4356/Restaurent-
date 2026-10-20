import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DELIVERY_FEE_PAISE,
  DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE,
  DEFAULT_MIN_DELIVERY_ORDER_PAISE,
  calculateLineTotal,
  calculateSubtotal,
  calculateDeliveryFee,
  validateDeliveryMinimum,
  calculateOrderTotals,
} from '../pricing';
import { formatPaiseToRupees } from '../utils';

describe('Pricing & Currency Engine (Strict Integer Paise)', () => {
  describe('calculateLineTotal', () => {
    it('calculates line item total in paise correctly', () => {
      // Hyderabadi Chicken Biryani (₹240 = 24000 paise) x 2 = 48000 paise (₹480)
      expect(calculateLineTotal(24000, 2)).toBe(48000);
    });

    it('returns 0 for non-positive quantity or price', () => {
      expect(calculateLineTotal(24000, 0)).toBe(0);
      expect(calculateLineTotal(24000, -1)).toBe(0);
      expect(calculateLineTotal(0, 2)).toBe(0);
    });
  });

  describe('calculateSubtotal', () => {
    it('accurately sums multiple menu items', () => {
      const items = [
        { pricePaise: 24000, quantity: 2 }, // ₹480 (48000 paise)
        { pricePaise: 6000, quantity: 3 },  // ₹180 (18000 paise)
        { pricePaise: 8000, quantity: 1 },  // ₹80 (8000 paise)
      ];
      // Total: 48000 + 18000 + 8000 = 74000 paise (₹740)
      expect(calculateSubtotal(items)).toBe(74000);
    });

    it('returns 0 for empty item list', () => {
      expect(calculateSubtotal([])).toBe(0);
    });
  });

  describe('calculateDeliveryFee', () => {
    it('charges 0 delivery fee for pickup orders regardless of amount', () => {
      expect(calculateDeliveryFee(8000, 'pickup')).toBe(0);
      expect(calculateDeliveryFee(25000, 'pickup')).toBe(0);
      expect(calculateDeliveryFee(80000, 'pickup')).toBe(0);
    });

    it('charges standard flat fee of ₹40 (4000 paise) for delivery under ₹500 (50000 paise)', () => {
      // ₹240 subtotal (24000 paise)
      expect(calculateDeliveryFee(24000, 'delivery')).toBe(DEFAULT_DELIVERY_FEE_PAISE);
      expect(calculateDeliveryFee(49900, 'delivery')).toBe(4000);
    });

    it('waives delivery fee (FREE delivery) for orders >= ₹500 (50000 paise)', () => {
      // Exactly ₹500
      expect(calculateDeliveryFee(50000, 'delivery')).toBe(0);
      // Above ₹500 (e.g. ₹750)
      expect(calculateDeliveryFee(75000, 'delivery')).toBe(0);
    });

    it('returns 0 delivery fee when cart subtotal is 0', () => {
      expect(calculateDeliveryFee(0, 'delivery')).toBe(0);
    });
  });

  describe('validateDeliveryMinimum', () => {
    it('rejects delivery orders below the ₹100 (10000 paise) threshold', () => {
      // ₹80 subtotal (8000 paise) -> short by 2000 paise (₹20)
      const result = validateDeliveryMinimum(8000, 'delivery');
      expect(result.isValid).toBe(false);
      expect(result.minOrderPaise).toBe(DEFAULT_MIN_DELIVERY_ORDER_PAISE);
      expect(result.differencePaise).toBe(2000);
    });

    it('accepts delivery orders meeting or exceeding ₹100', () => {
      // Exactly ₹100
      const exact = validateDeliveryMinimum(10000, 'delivery');
      expect(exact.isValid).toBe(true);
      expect(exact.differencePaise).toBe(0);

      // ₹240
      const above = validateDeliveryMinimum(24000, 'delivery');
      expect(above.isValid).toBe(true);
      expect(above.differencePaise).toBe(0);
    });

    it('always passes pickup orders regardless of subtotal', () => {
      const result = validateDeliveryMinimum(3000, 'pickup');
      expect(result.isValid).toBe(true);
      expect(result.differencePaise).toBe(0);
    });
  });

  describe('calculateOrderTotals', () => {
    it('correctly calculates delivery order with fee applied', () => {
      const result = calculateOrderTotals({
        items: [
          { pricePaise: 24000, quantity: 1 }, // ₹240
        ],
        orderType: 'delivery',
      });

      expect(result.subtotalPaise).toBe(24000);
      expect(result.deliveryFeePaise).toBe(4000); // ₹40 delivery fee
      expect(result.totalPaise).toBe(28000); // ₹280 total
      expect(result.amountToFreeDeliveryPaise).toBe(26000); // Needs ₹260 more for free delivery
      expect(result.meetsDeliveryMinimum).toBe(true);
    });

    it('correctly calculates free delivery when threshold reached', () => {
      const result = calculateOrderTotals({
        items: [
          { pricePaise: 24000, quantity: 2 }, // ₹480
          { pricePaise: 6000, quantity: 1 },  // ₹60 -> Total ₹540
        ],
        orderType: 'delivery',
      });

      expect(result.subtotalPaise).toBe(54000);
      expect(result.deliveryFeePaise).toBe(0); // Free delivery
      expect(result.totalPaise).toBe(54000);
      expect(result.amountToFreeDeliveryPaise).toBe(0);
      expect(result.meetsDeliveryMinimum).toBe(true);
    });
  });

  describe('formatPaiseToRupees', () => {
    it('formats exact rupees cleanly without decimals', () => {
      const formatted = formatPaiseToRupees(24000);
      // Removes non-breaking space if localized by Intl
      expect(formatted.replace(/\s/g, ' ')).toMatch(/₹\s?240/);
    });

    it('formats 50 paise fractional amount with two decimal places', () => {
      const formatted = formatPaiseToRupees(24050);
      expect(formatted.replace(/\s/g, ' ')).toMatch(/₹\s?240\.50/);
    });

    it('formats 0 paise as ₹0', () => {
      const formatted = formatPaiseToRupees(0);
      expect(formatted.replace(/\s/g, ' ')).toMatch(/₹\s?0/);
    });
  });
});
