/**
 * Promotions engine - shared types.
 *
 * All money is integer paise. All evaluation is pure and server-authoritative:
 * the browser may *preview* a quote, but `placeOrder` recomputes it and only
 * the server's answer is stored.
 */

export type DiscountType = 'percent' | 'flat' | 'free_delivery';
export type PromotionScope = 'order' | 'category' | 'item';
export type PromotionOrderType = 'any' | 'delivery' | 'pickup';
export type CustomerSegment = 'all' | 'first_order' | 'returning' | 'loyalty_pass';

export interface PromotionItemScope {
  menu_item_id: string | null;
  category_id: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  /** null = automatic offer, no code required. */
  code: string | null;
  discount_type: DiscountType;
  /** percent: 1-100. flat / free_delivery: paise. */
  discount_value: number;
  max_discount_paise: number | null;
  applies_to: PromotionScope;
  min_order_paise: number;
  order_type: PromotionOrderType;
  customer_segment: CustomerSegment;
  starts_at: string | null;
  ends_at: string | null;
  /** 0 = Sunday .. 6 = Saturday. Empty/null = every day. */
  days_of_week: number[] | null;
  time_from: string | null;
  time_to: string | null;
  /** 0 = unlimited. */
  total_redemption_limit: number;
  /** 0 = unlimited (soft: keyed on phone / account). */
  per_customer_limit: number;
  times_redeemed: number;
  budget_cap_paise: number | null;
  discount_given_paise: number;
  is_stackable: boolean;
  priority: number;
  is_auto_apply: boolean;
  is_active: boolean;
  /** Scoped items / categories (only used when applies_to != 'order'). */
  items?: PromotionItemScope[];
}

export interface CartLine {
  menuItemId: string;
  categoryId: string;
  name: string;
  pricePaise: number;
  quantity: number;
}

export interface EvaluationContext {
  orderType: 'delivery' | 'pickup';
  /** Delivery fee the customer would otherwise pay (needed for free_delivery). */
  deliveryFeePaise: number;
  /** Used for soft per-customer limits and audit. */
  customerPhone?: string | null;
  /** Logged-in account, when present. */
  customerUserId?: string | null;
  /** promotionId -> times this phone/account has redeemed it. */
  customerRedemptions?: Record<string, number>;
  /** undefined = unknown (offer requires an account). */
  isFirstOrder?: boolean;
  hasLoyaltyPass?: boolean;
  /** Reference time, injectable for tests. */
  now?: Date;
}

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  code: string | null;
  /** Discount applied against the items (already allocated per line). */
  itemDiscountPaise: number;
  /** True when the delivery fee was waived. */
  freeDelivery: boolean;
  /** What the customer saved in total (item discount + delivery fee). */
  totalSavingPaise: number;
  /** menuItemId -> paise allocated to that line. Empty for free_delivery. */
  allocation: Record<string, number>;
}

export interface RejectedPromotion {
  promotionId: string;
  name: string;
  code: string | null;
  /** Short, customer-facing explanation. */
  reason: string;
}

export interface PromotionTotals {
  subtotalPaise: number;
  itemDiscountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  /** Total saved: item discount + delivery fee waived. */
  savingsPaise: number;
}

export interface PromotionQuote {
  applied: AppliedPromotion | null;
  /** Every offer that would be valid for this cart (for the "offers for you" strip). */
  eligible: AppliedPromotion[];
  rejected: RejectedPromotion[];
  /** Set when the customer typed a code that could not be used. */
  codeError: string | null;
  /** Set when a typed code was applied but a better automatic offer existed. */
  betterAutoOffer: { name: string; totalSavingPaise: number } | null;
  totals: PromotionTotals;
}
