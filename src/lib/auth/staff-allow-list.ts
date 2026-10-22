/**
 * Staff authorization allow-list
 * ---------------------------------------------------------------------------
 * Authentication answers "who are you?"; this answers "are you allowed in?".
 *
 * Without an allow-list the portal trusts ANY authenticated Supabase account -
 * which is dangerous while public sign-ups are enabled, because a stranger
 * could register, confirm their email and reach the kitchen dashboard.
 *
 * Configure STAFF_EMAILS as a comma-separated list of staff email addresses.
 * While it is unset the app stays permissive (so nobody is locked out during
 * rollout), but Supabase sign-ups should ALSO be disabled in that window.
 *
 * This module is intentionally dependency-free so it can be imported by both
 * the Proxy (edge) and the server-only data access layer.
 */

export function getStaffAllowList(): string[] {
  return (process.env.STAFF_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the email may use the staff portal. */
export function isStaffEmail(email: string | null | undefined): boolean {
  const allowList = getStaffAllowList();

  // Not configured yet - do not lock the owner out. See docs/OPERATIONS_MANUAL.md.
  if (allowList.length === 0) return true;

  if (!email) return false;

  return allowList.includes(email.trim().toLowerCase());
}

/** True when an explicit staff allow-list is configured. */
export function hasStaffAllowList(): boolean {
  return getStaffAllowList().length > 0;
}
