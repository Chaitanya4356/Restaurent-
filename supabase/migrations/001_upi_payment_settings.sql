-- ============================================================================
-- 001_upi_payment_settings.sql
-- Adds owner-configurable UPI payment details to the singleton settings row.
--
-- Safe to run more than once (IF NOT EXISTS). Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS upi_id TEXT,
    ADD COLUMN IF NOT EXISTS upi_phone TEXT,
    ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
    ADD COLUMN IF NOT EXISTS upi_payee_name TEXT;

-- No policy changes needed:
--   * "Public can view restaurant settings" already allows anon SELECT
--   * "Authenticated staff update settings" already allows staff UPDATE
