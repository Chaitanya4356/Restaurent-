import {
  type Coordinates,
  estimateDeliveryMinutes,
  estimateRoadDistanceKm,
  haversineKm,
  isValidCoordinates,
} from '@/lib/geo';

/**
 * Delivery serviceability
 * ---------------------------------------------------------------------------
 * The owner maintains an allow-list of pincodes in /admin/settings. This is how
 * a restaurant's delivery area actually works in practice, and it costs nothing
 * and never fails the way address geocoding does.
 *
 * Rules:
 *   * allow-list EMPTY  -> delivery is open to every address (safe default)
 *   * allow-list has rows -> only those pincodes may place a DELIVERY order
 *   * pickup orders are never restricted
 *
 * This module is pure (no server-only imports) so the checkout can run the
 * exact same logic in the browser for instant feedback.
 */

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export interface DeliveryPincode {
  pincode: string;
  area_name: string | null;
  is_active: boolean;
}

/**
 * True when the pincode may receive a delivery order.
 * An empty allow-list means "not configured yet", so everything is allowed.
 */
export function isPincodeServiceable(
  pincode: string,
  allowedPincodes: Array<{ pincode: string }>
): boolean {
  if (allowedPincodes.length === 0) return true;
  return allowedPincodes.some((entry) => entry.pincode === pincode);
}

export interface ServiceabilityInput {
  pincode?: string | null;
  coordinates?: Coordinates | null;
  allowedPincodes: Array<{ pincode: string }>;
  radiusKm: number;
  /** Outlet location from settings - null until the owner sets it. */
  outlet?: Coordinates | null;
  prepTimeMinutes?: number;
  avgSpeedKmh?: number;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  /** Which signal decided the outcome - drives the UI copy. */
  decidedBy: 'distance' | 'pincode' | 'unconfigured';
  /** Road-distance estimate in km, when coordinates were available. */
  distanceKm: number | null;
  /** Estimated delivery time in minutes, when the distance is known. */
  etaMinutes: number | null;
  message?: string;
}

/**
 * The single source of truth for "can we deliver here?".
 *
 * Used by the checkout UI (instant feedback) and by placeOrder() (enforcement),
 * so the customer can never be shown one answer and given another.
 *
 * Priority: exact coordinates beat a pincode guess. Pincodes remain the
 * fallback for customers who do not share their location.
 */
export function checkDeliveryServiceability(input: ServiceabilityInput): ServiceabilityResult {
  const {
    pincode,
    coordinates,
    allowedPincodes,
    radiusKm,
    outlet,
    prepTimeMinutes = 25,
    avgSpeedKmh = 18,
  } = input;

  // 1. Best signal: we know both locations.
  if (isValidCoordinates(outlet) && isValidCoordinates(coordinates)) {
    const straightLine = haversineKm(outlet as Coordinates, coordinates as Coordinates);
    const distanceKm = Number(estimateRoadDistanceKm(straightLine).toFixed(2));
    const etaMinutes = estimateDeliveryMinutes({
      distanceKm,
      prepTimeMinutes,
      avgSpeedKmh,
    });

    if (distanceKm <= radiusKm) {
      return { serviceable: true, decidedBy: 'distance', distanceKm, etaMinutes };
    }

    return {
      serviceable: false,
      decidedBy: 'distance',
      distanceKm,
      etaMinutes,
      message: `You are about ${distanceKm.toFixed(1)} km away, outside our ${radiusKm} km delivery area. You can still order for Counter Pickup.`,
    };
  }

  // 2. Fallback: the owner's pincode allow-list.
  if (allowedPincodes.length > 0) {
    const ok = isPincodeServiceable(pincode ?? '', allowedPincodes);

    return {
      serviceable: ok,
      decidedBy: 'pincode',
      distanceKm: null,
      etaMinutes: null,
      message: ok
        ? undefined
        : `Sorry, we do not deliver to pincode ${pincode} yet. Please choose Counter Pickup or call us.`,
    };
  }

  // 3. Nothing configured - stay open (and stay backwards compatible).
  return { serviceable: true, decidedBy: 'unconfigured', distanceKm: null, etaMinutes: null };
}
