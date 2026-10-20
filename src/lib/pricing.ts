/**
 * Pricing and financial calculation engine for Josh Restaurant.
 *
 * STRICT FINANCIAL RULES:
 * 1. All money is strictly stored and calculated as integers in PAISE (1 INR = 100 paise).
 * 2. Flat delivery fee is ₹40 (4000 paise).
 * 3. Free delivery applies for orders >= ₹500 (50000 paise).
 * 4. Minimum order amount for delivery is ₹100 (10000 paise).
 * 5. Pickup orders always have ₹0 delivery fee.
 */

export const DEFAULT_DELIVERY_FEE_PAISE = 4000; // ₹40.00
export const DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE = 50000; // ₹500.00
export const DEFAULT_MIN_DELIVERY_ORDER_PAISE = 10000; // ₹100.00

export interface PricingItem {
  pricePaise: number;
  quantity: number;
}

export interface OrderTotalsCalculation {
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  amountToFreeDeliveryPaise: number;
  meetsDeliveryMinimum: boolean;
}

/**
 * Calculates item line total in integer paise.
 */
export function calculateLineTotal(pricePaise: number, quantity: number): number {
  if (quantity <= 0 || pricePaise <= 0) return 0;
  return Math.round(pricePaise * quantity);
}

/**
 * Calculates cart or order subtotal from an array of items.
 */
export function calculateSubtotal(items: PricingItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item.pricePaise, item.quantity), 0);
}

/**
 * Calculates delivery fee based on order type, subtotal, and threshold.
 */
export function calculateDeliveryFee(
  subtotalPaise: number,
  orderType: 'pickup' | 'delivery',
  thresholdPaise: number = DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE,
  feePaise: number = DEFAULT_DELIVERY_FEE_PAISE
): number {
  if (orderType === 'pickup') {
    return 0;
  }

  if (subtotalPaise <= 0) {
    return 0;
  }

  if (subtotalPaise >= thresholdPaise) {
    return 0;
  }

  return feePaise;
}

/**
 * Checks whether the subtotal satisfies the minimum delivery order requirement.
 */
export function validateDeliveryMinimum(
  subtotalPaise: number,
  orderType: 'pickup' | 'delivery',
  minOrderPaise: number = DEFAULT_MIN_DELIVERY_ORDER_PAISE
): {
  isValid: boolean;
  minOrderPaise: number;
  differencePaise: number;
} {
  if (orderType === 'pickup') {
    return {
      isValid: true,
      minOrderPaise: 0,
      differencePaise: 0,
    };
  }

  const isValid = subtotalPaise >= minOrderPaise;
  const differencePaise = isValid ? 0 : minOrderPaise - subtotalPaise;

  return {
    isValid,
    minOrderPaise,
    differencePaise,
  };
}

/**
 * Calculates complete order totals including subtotal, delivery fee, grand total,
 * remaining amount for free delivery, and delivery threshold eligibility.
 */
export function calculateOrderTotals(params: {
  items: PricingItem[];
  orderType: 'pickup' | 'delivery';
  thresholdPaise?: number;
  feePaise?: number;
  minOrderPaise?: number;
}): OrderTotalsCalculation {
  const {
    items,
    orderType,
    thresholdPaise = DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE,
    feePaise = DEFAULT_DELIVERY_FEE_PAISE,
    minOrderPaise = DEFAULT_MIN_DELIVERY_ORDER_PAISE,
  } = params;

  const subtotalPaise = calculateSubtotal(items);
  const deliveryFeePaise = calculateDeliveryFee(subtotalPaise, orderType, thresholdPaise, feePaise);
  const totalPaise = subtotalPaise + deliveryFeePaise;
  const amountToFreeDeliveryPaise = Math.max(0, thresholdPaise - subtotalPaise);
  const { isValid: meetsDeliveryMinimum } = validateDeliveryMinimum(
    subtotalPaise,
    orderType,
    minOrderPaise
  );

  return {
    subtotalPaise,
    deliveryFeePaise,
    totalPaise,
    amountToFreeDeliveryPaise,
    meetsDeliveryMinimum,
  };
}
