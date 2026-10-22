import crypto from 'crypto';

/**
 * Order tracking tokens
 * ---------------------------------------------------------------------------
 * Order numbers look like `JOSH-20261022-4921`, so a single day only has a few
 * thousand possible values - far too guessable to protect customer data with.
 *
 * A tracking token is an HMAC of the order's UUID, signed with a server-only
 * secret. It cannot be derived or forged without that secret, and it requires
 * no database column, so existing orders keep working with zero migration.
 *
 * The token is checked with `crypto.timingSafeEqual` to avoid timing attacks.
 */

function getSecret(): string {
  // Dedicated secret preferred; the service-role key is a high-entropy
  // fallback so the feature works without extra configuration.
  return (
    process.env.TRACKING_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

/**
 * Creates the opaque, URL-safe tracking token for an order.
 * Deterministic: the same order always produces the same token.
 */
export function createTrackingToken(orderId: string): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error('Missing TRACKING_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(`order-tracking:${orderId}`)
    .digest('base64url')
    .slice(0, 24);
}

/**
 * Returns true only when the token matches the order it was issued for.
 * Never throws: malformed or missing tokens are treated as invalid.
 */
export function verifyTrackingToken(orderId: string, token: string | null | undefined): boolean {
  if (!orderId || !token) return false;

  try {
    const expected = Buffer.from(createTrackingToken(orderId), 'utf8');
    const received = Buffer.from(token, 'utf8');

    if (expected.length !== received.length) return false;

    return crypto.timingSafeEqual(expected, received);
  } catch (e) {
    console.error('Failed to verify tracking token:', e);
    return false;
  }
}

/**
 * Builds the shareable customer tracking URL for an order.
 */
export function buildTrackingPath(orderNumber: string, orderId: string): string {
  return `/order-confirmation/${encodeURIComponent(orderNumber)}/${createTrackingToken(orderId)}`;
}
