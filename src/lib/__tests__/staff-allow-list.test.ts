import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStaffAllowList, isStaffEmail, hasStaffAllowList } from '@/lib/auth/staff-allow-list';

/**
 * Authorization allow-list.
 *
 * Authentication alone must not be enough to reach the staff portal: while
 * public sign-ups are enabled in Supabase, anyone could register and land on
 * service-role-backed admin actions.
 */
describe('staff allow-list', () => {
  const original = process.env.STAFF_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.STAFF_EMAILS;
    else process.env.STAFF_EMAILS = original;
  });

  describe('when STAFF_EMAILS is not configured', () => {
    beforeEach(() => {
      delete process.env.STAFF_EMAILS;
    });

    it('stays permissive so the owner is never locked out', () => {
      expect(hasStaffAllowList()).toBe(false);
      expect(isStaffEmail('anyone@example.com')).toBe(true);
    });
  });

  describe('when STAFF_EMAILS is configured', () => {
    beforeEach(() => {
      process.env.STAFF_EMAILS = ' Owner@Josh.com , manager@josh.com ';
    });

    it('parses, trims and lowercases the list', () => {
      expect(getStaffAllowList()).toEqual(['owner@josh.com', 'manager@josh.com']);
      expect(hasStaffAllowList()).toBe(true);
    });

    it('allows listed staff regardless of case or spacing', () => {
      expect(isStaffEmail('owner@josh.com')).toBe(true);
      expect(isStaffEmail('OWNER@JOSH.COM')).toBe(true);
      expect(isStaffEmail('  manager@josh.com ')).toBe(true);
    });

    it('denies accounts that are not on the list', () => {
      expect(isStaffEmail('stranger@example.com')).toBe(false);
      expect(isStaffEmail('owner@josh.com.evil.com')).toBe(false);
    });

    it('denies missing emails', () => {
      expect(isStaffEmail(null)).toBe(false);
      expect(isStaffEmail(undefined)).toBe(false);
      expect(isStaffEmail('')).toBe(false);
    });
  });
});
