import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for the staff Data Access Layer (src/lib/auth/require-staff.ts).
 *
 * These lock in the rule that protects the whole staff portal: every staff
 * page and every staff server action must reject callers without a valid
 * Supabase session BEFORE any service-role (RLS-bypassing) query runs.
 */

const getUserMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const { getStaffUser, requireStaff, assertStaff } = await import(
  '@/lib/auth/require-staff'
);

describe('staff access control (DAL)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it('resolves the signed-in staff user from a valid session', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'chef@josh.com' } },
      error: null,
    });

    const user = await getStaffUser();

    expect(user).toEqual({ id: 'user-123', email: 'chef@josh.com' });
  });

  it('returns null when there is no session', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    expect(await getStaffUser()).toBeNull();
  });

  it('returns null when the auth server rejects the session', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });

    expect(await getStaffUser()).toBeNull();
  });

  it('requireStaff() redirects anonymous visitors to the staff login screen', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireStaff()).rejects.toThrow(/NEXT_REDIRECT:\/admin\/login/);
  });

  it('requireStaff() returns the user for an authenticated staff member', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'chef@josh.com' } },
      error: null,
    });

    await expect(requireStaff()).resolves.toEqual({
      id: 'user-123',
      email: 'chef@josh.com',
    });
  });

  it('assertStaff() denies anonymous callers without throwing', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const result = await assertStaff();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sign in/i);
    }
  });

  it('assertStaff() allows authenticated staff', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'chef@josh.com' } },
      error: null,
    });

    const result = await assertStaff();

    expect(result.ok).toBe(true);
  });
});
