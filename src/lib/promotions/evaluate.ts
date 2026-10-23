import { allocateDiscount } from './allocate';
import type {
  AppliedPromotion,
  CartLine,
  EvaluationContext,
  Promotion,
  PromotionQuote,
  RejectedPromotion,
} from './types';

/**
 * Promotion evaluation.
 *
 * Pure function - no database, no clock, no I/O. The server passes in the cart,
 * the active promotions and a context (including `now`), and gets back exactly
 * what to charge plus a human explanation for everything that did not apply.
 *
 * Policy implemented here:
 *   * ONE primary discount per order (no stacking in phase A)
 *   * a typed code wins over an automatic offer, but the customer is told when
 *     an automatic offer would have saved more
 *   * free-delivery offers do not stack with a discount; the best single offer
 *     wins
 */

const IST_TIME_ZONE = 'Asia/Kolkata';

interface IstMoment {
  /** 0 = Sunday .. 6 = Saturday */
  dayOfWeek: number;
  /** Minutes since midnight */
  minutes: number;
}

function getIstMoment(date: Date): IstMoment {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);

  return {
    dayOfWeek: dayIndex === -1 ? 0 : dayIndex,
    minutes: (hour % 24) * 60 + minute,
  };
}

function timeToMinutes(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
}

const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);

function lineTotal(line: CartLine): number {
  return Math.max(0, line.pricePaise * line.quantity);
}

function scopedLines(promotion: Promotion, lines: CartLine[]): CartLine[] {
  if (promotion.applies_to === 'order') return lines;

  const itemIds = new Set(
    (promotion.items ?? []).map((entry) => entry.menu_item_id).filter(Boolean) as string[]
  );
  const categoryIds = new Set(
    (promotion.items ?? []).map((entry) => entry.category_id).filter(Boolean) as string[]
  );

  return lines.filter((line) => itemIds.has(line.menuItemId) || categoryIds.has(line.categoryId));
}

/** Returns null when eligible, or a customer-facing reason when not. */
function checkEligibility(
  promotion: Promotion,
  lines: CartLine[],
  subtotalPaise: number,
  context: EvaluationContext
): { reason: string } | { eligibleLines: CartLine[] } {
  const now = context.now ?? new Date();

  if (!promotion.is_active) {
    return { reason: 'This offer is not available right now.' };
  }

  if (promotion.starts_at && now.getTime() < new Date(promotion.starts_at).getTime()) {
    return { reason: 'This offer has not started yet.' };
  }

  if (promotion.ends_at && now.getTime() > new Date(promotion.ends_at).getTime()) {
    return { reason: 'This offer has ended.' };
  }

  const moment = getIstMoment(now);

  if (promotion.days_of_week && promotion.days_of_week.length > 0) {
    if (!promotion.days_of_week.includes(moment.dayOfWeek)) {
      return { reason: 'This offer is only available on certain days.' };
    }
  }

  if (promotion.time_from && promotion.time_to) {
    const from = timeToMinutes(promotion.time_from);
    const to = timeToMinutes(promotion.time_to);
    const withinWindow =
      from <= to
        ? moment.minutes >= from && moment.minutes <= to
        : moment.minutes >= from || moment.minutes <= to; // overnight window

    if (!withinWindow) {
      return { reason: 'This offer is only available during certain hours.' };
    }
  }

  if (promotion.order_type !== 'any' && promotion.order_type !== context.orderType) {
    return {
      reason:
        promotion.order_type === 'delivery'
          ? 'Valid on delivery orders only.'
          : 'Valid on pickup orders only.',
    };
  }

  if (promotion.customer_segment !== 'all') {
    if (promotion.customer_segment === 'first_order') {
      if (context.isFirstOrder === undefined) return { reason: 'Sign in to use this offer.' };
      if (!context.isFirstOrder) return { reason: 'This offer is for first orders only.' };
    }
    if (promotion.customer_segment === 'returning') {
      if (context.isFirstOrder === undefined) return { reason: 'Sign in to use this offer.' };
      if (context.isFirstOrder) return { reason: 'This offer is for returning customers.' };
    }
    if (promotion.customer_segment === 'loyalty_pass') {
      if (!context.hasLoyaltyPass) return { reason: 'This offer is for Loyalty Pass holders.' };
    }
  }

  if (promotion.total_redemption_limit > 0 && promotion.times_redeemed >= promotion.total_redemption_limit) {
    return { reason: 'This offer has reached its limit.' };
  }

  if (
    promotion.budget_cap_paise !== null &&
    promotion.discount_given_paise >= promotion.budget_cap_paise
  ) {
    return { reason: 'This offer is no longer available.' };
  }

  if (promotion.per_customer_limit > 0) {
    const alreadyUsed = context.customerRedemptions?.[promotion.id] ?? 0;
    if (alreadyUsed >= promotion.per_customer_limit) {
      return {
        reason: context.customerUserId
          ? 'You have already used this offer.'
          : 'This offer can only be used once per customer.',
      };
    }
  }

  const eligibleLines = scopedLines(promotion, lines);

  if (eligibleLines.length === 0) {
    return { reason: 'No eligible items in your cart for this offer.' };
  }

  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + lineTotal(line), 0);

  if (promotion.applies_to === 'order' && subtotalPaise < promotion.min_order_paise) {
    const gap = promotion.min_order_paise - subtotalPaise;
    return { reason: `Add ${inr(gap)} more to use this offer.` };
  }

  if (promotion.applies_to !== 'order' && eligibleSubtotal < promotion.min_order_paise) {
    const gap = promotion.min_order_paise - eligibleSubtotal;
    return { reason: `Add ${inr(gap)} more of the eligible items to use this offer.` };
  }

  return { eligibleLines };
}

/** Computes the money value of an otherwise-eligible promotion. */
function valueOf(
  promotion: Promotion,
  eligibleLines: CartLine[],
  context: EvaluationContext
): AppliedPromotion | null {
  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + lineTotal(line), 0);

  if (promotion.discount_type === 'free_delivery') {
    if (context.orderType !== 'delivery') return null;
    if (context.deliveryFeePaise <= 0) return null; // already free

    return {
      promotionId: promotion.id,
      name: promotion.name,
      code: promotion.code,
      itemDiscountPaise: 0,
      freeDelivery: true,
      totalSavingPaise: context.deliveryFeePaise,
      allocation: {},
    };
  }

  let itemDiscountPaise = 0;

  if (promotion.discount_type === 'percent') {
    const percent = Math.min(100, Math.max(0, promotion.discount_value));
    itemDiscountPaise = Math.floor((eligibleSubtotal * percent) / 100);
  } else {
    itemDiscountPaise = Math.min(promotion.discount_value, eligibleSubtotal);
  }

  if (promotion.max_discount_paise !== null) {
    itemDiscountPaise = Math.min(itemDiscountPaise, promotion.max_discount_paise);
  }

  itemDiscountPaise = Math.max(0, Math.min(itemDiscountPaise, eligibleSubtotal));

  if (itemDiscountPaise <= 0) return null;

  return {
    promotionId: promotion.id,
    name: promotion.name,
    code: promotion.code,
    itemDiscountPaise,
    freeDelivery: false,
    totalSavingPaise: itemDiscountPaise,
    allocation: allocateDiscount(
      itemDiscountPaise,
      eligibleLines.map((line) => ({ menuItemId: line.menuItemId, amountPaise: lineTotal(line) }))
    ),
  };
}

function totalsFor(
  subtotalPaise: number,
  deliveryFeePaise: number,
  applied: AppliedPromotion | null
): PromotionQuote['totals'] {
  const itemDiscountPaise = applied?.itemDiscountPaise ?? 0;
  const feePaid = applied?.freeDelivery ? 0 : deliveryFeePaise;
  const totalPaise = Math.max(0, subtotalPaise - itemDiscountPaise + feePaid);

  return {
    subtotalPaise,
    itemDiscountPaise,
    deliveryFeePaise: feePaid,
    totalPaise,
    savingsPaise: itemDiscountPaise + (applied?.freeDelivery ? deliveryFeePaise : 0),
  };
}

/** Best value first, then priority, then name (deterministic). */
function rank(a: AppliedPromotion, b: AppliedPromotion, promotions: Promotion[]): number {
  if (b.totalSavingPaise !== a.totalSavingPaise) return b.totalSavingPaise - a.totalSavingPaise;

  const pa = promotions.find((p) => p.id === a.promotionId)?.priority ?? 100;
  const pb = promotions.find((p) => p.id === b.promotionId)?.priority ?? 100;
  if (pa !== pb) return pa - pb;

  return a.name.localeCompare(b.name);
}

export function evaluatePromotions(params: {
  lines: CartLine[];
  promotions: Promotion[];
  context: EvaluationContext;
  /** Code the customer typed (optional). */
  code?: string | null;
}): PromotionQuote {
  const { lines, promotions, context } = params;
  const typedCode = (params.code ?? '').trim().toUpperCase();

  const subtotalPaise = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const eligible: AppliedPromotion[] = [];
  const rejected: RejectedPromotion[] = [];

  const promotionById = new Map(promotions.map((p) => [p.id, p]));

  for (const promotion of promotions) {
    const eligibility = checkEligibility(promotion, lines, subtotalPaise, context);

    if ('reason' in eligibility) {
      rejected.push({
        promotionId: promotion.id,
        name: promotion.name,
        code: promotion.code,
        reason: eligibility.reason,
      });
      continue;
    }

    const applied = valueOf(promotion, eligibility.eligibleLines, context);

    if (!applied) {
      rejected.push({
        promotionId: promotion.id,
        name: promotion.name,
        code: promotion.code,
        reason: 'This offer would not reduce your total.',
      });
      continue;
    }

    eligible.push(applied);
  }

  eligible.sort((a, b) => rank(a, b, promotions));

  // Which offer do we actually use?
  let applied: AppliedPromotion | null = null;
  let codeError: string | null = null;
  let betterAutoOffer: PromotionQuote['betterAutoOffer'] = null;

  const matchingCode = typedCode
    ? eligible.find((entry) => (entry.code ?? '').toUpperCase() === typedCode)
    : undefined;

  const codeRejection = typedCode
    ? rejected.find((entry) => (entry.code ?? '').toUpperCase() === typedCode)
    : undefined;

  if (typedCode) {
    if (matchingCode) {
      applied = matchingCode;
      const best = eligible[0];
      if (best && best.promotionId !== matchingCode.promotionId && best.totalSavingPaise > matchingCode.totalSavingPaise) {
        betterAutoOffer = { name: best.name, totalSavingPaise: best.totalSavingPaise };
      }
    } else {
      codeError = codeRejection
        ? codeRejection.reason
        : 'That code is not valid. Please check it and try again.';
    }
  }

  // Fall back to the best automatic offer
  if (!applied) {
    const automatic = eligible.find(
      (entry) => promotionById.get(entry.promotionId)?.is_auto_apply && !entry.code
    );
    applied = automatic ?? null;
  }

  return {
    applied,
    eligible,
    rejected,
    codeError,
    betterAutoOffer,
    totals: totalsFor(subtotalPaise, context.deliveryFeePaise, applied),
  };
}
