import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTrackingToken,
  verifyTrackingToken,
  buildTrackingPath,
} from '@/lib/tracking';

/**
 * Tests for the signed order-tracking tokens that replaced guessable
 * order-number-only lookup (which exposed customer name / phone / address).
 */

const ORDER_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ORDER_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('order tracking tokens', () => {
  const originalSecret = process.env.TRACKING_TOKEN_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.TRACKING_TOKEN_SECRET = 'test-tracking-secret-value';
  });

  afterEach(() => {
    process.env.TRACKING_TOKEN_SECRET = originalSecret;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  });

  it('creates a deterministic, URL-safe token', () => {
    const first = createTrackingToken(ORDER_A);
    const second = createTrackingToken(ORDER_A);

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it('issues different tokens for different orders', () => {
    expect(createTrackingToken(ORDER_A)).not.toBe(createTrackingToken(ORDER_B));
  });

  it('verifies a valid token', () => {
    expect(verifyTrackingToken(ORDER_A, createTrackingToken(ORDER_A))).toBe(true);
  });

  it('rejects a token issued for another order', () => {
    expect(verifyTrackingToken(ORDER_A, createTrackingToken(ORDER_B))).toBe(false);
  });

  it('rejects tampered, empty and malformed tokens', () => {
    const token = createTrackingToken(ORDER_A);

    expect(verifyTrackingToken(ORDER_A, token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'))).toBe(false);
    expect(verifyTrackingToken(ORDER_A, '')).toBe(false);
    expect(verifyTrackingToken(ORDER_A, null)).toBe(false);
    expect(verifyTrackingToken(ORDER_A, undefined)).toBe(false);
    expect(verifyTrackingToken(ORDER_A, 'short')).toBe(false);
  });

  it('falls back to the service-role key when no dedicated secret is set', () => {
    delete process.env.TRACKING_TOKEN_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fallback-secret-value';

    expect(verifyTrackingToken(ORDER_A, createTrackingToken(ORDER_A))).toBe(true);
  });

  it('produces a shareable path containing the order number and token', () => {
    const path = buildTrackingPath('JOSH-20261022-1234', ORDER_A);

    expect(path).toBe(`/order-confirmation/JOSH-20261022-1234/${createTrackingToken(ORDER_A)}`);
  });
});
